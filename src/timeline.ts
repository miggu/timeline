export interface TimelineEvent {
	id: string;
	year: number;
	leftPercent: number;
	widthPercent: number;
}

export type ResizeEdge = "start" | "end";

export const WEEK_COUNT = 52;
export const WEEK_PERCENT = 100 / WEEK_COUNT;
export const MIN_EVENT_WIDTH_PERCENT = WEEK_PERCENT;
export const EVENT_BLOCK_TOP = 10;

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const roundPercent = (value: number) => Number(value.toFixed(6));

const snapPercentToWeek = (value: number) =>
	roundPercent(Math.round(value / WEEK_PERCENT) * WEEK_PERCENT);

export const getLeftPercentForWeek = (weekNumber: number) =>
	roundPercent(clamp((weekNumber - 1) * WEEK_PERCENT, 0, 100 - WEEK_PERCENT));

export const moveTimelineEventToWeek = (
	event: TimelineEvent,
	year: number,
	weekNumber: number,
): TimelineEvent => {
	const nextLeftPercent = clamp(
		snapPercentToWeek(getLeftPercentForWeek(weekNumber)),
		0,
		100 - event.widthPercent,
	);

	return {
		...event,
		year,
		leftPercent: roundPercent(nextLeftPercent),
	};
};

export const resizeTimelineEvent = (
	event: TimelineEvent,
	edge: ResizeEdge,
	deltaPercent: number,
): TimelineEvent => {
	if (edge === "start") {
		const rightPercent = event.leftPercent + event.widthPercent;
		const nextLeftPercent = clamp(
			snapPercentToWeek(event.leftPercent + deltaPercent),
			0,
			rightPercent - MIN_EVENT_WIDTH_PERCENT,
		);

		return {
			...event,
			leftPercent: roundPercent(nextLeftPercent),
			widthPercent: roundPercent(rightPercent - nextLeftPercent),
		};
	}

	const nextWidthPercent = clamp(
		snapPercentToWeek(event.widthPercent + deltaPercent),
		MIN_EVENT_WIDTH_PERCENT,
		100 - event.leftPercent,
	);

	return {
		...event,
		widthPercent: roundPercent(nextWidthPercent),
	};
};
