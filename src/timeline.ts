import type { ResizeEdge, TimelineEvent } from "./types";

export const WEEK_COUNT = 52;
export const WEEK_PERCENT = 100 / WEEK_COUNT;
export const MIN_EVENT_WIDTH_PERCENT = WEEK_PERCENT;
export const MAX_EVENT_LANES = 2;
export const EVENT_BLOCK_TOP = 10;
export const EVENT_BLOCK_HEIGHT = 24;
export const EVENT_LANE_GAP = 8;
export const LOG_EVENT_WIDTH_PERCENT = Number((WEEK_PERCENT * 7).toFixed(6));

export const EVENT_COLOR_PALETTE = [
	{ color: "#5679A6", glow: "rgba(86, 121, 166, 0.28)" },
	{ color: "#6394BF", glow: "rgba(99, 148, 191, 0.28)" },
	{ color: "#62733F", glow: "rgba(98, 115, 63, 0.28)" },
	{ color: "#D99B29", glow: "rgba(217, 155, 41, 0.28)" },
	{ color: "#A6771F", glow: "rgba(166, 119, 31, 0.28)" },
] as const;

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const roundPercent = (value: number) => Number(value.toFixed(6));
const doIntervalsOverlap = (
	leftA: number,
	widthA: number,
	leftB: number,
	widthB: number,
) => leftA < leftB + widthB && leftB < leftA + widthA;

const snapPercentToWeek = (value: number) =>
	roundPercent(Math.round(value / WEEK_PERCENT) * WEEK_PERCENT);

export const getLeftPercentForWeek = (weekNumber: number) =>
	roundPercent(clamp((weekNumber - 1) * WEEK_PERCENT, 0, 100 - WEEK_PERCENT));

export const getEventLaneTop = (lane: number) =>
	EVENT_BLOCK_TOP + lane * (EVENT_BLOCK_HEIGHT + EVENT_LANE_GAP);

export const getEventPaletteColor = (colorIndex: number) =>
	EVENT_COLOR_PALETTE[
		((colorIndex % EVENT_COLOR_PALETTE.length) + EVENT_COLOR_PALETTE.length) %
			EVENT_COLOR_PALETTE.length
	];

export const moveTimelineEventToWeek = (
	event: TimelineEvent,
	year: number,
	weekNumber: number,
	lane: number,
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
		lane,
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

export const findNextEventPlacement = (
	events: TimelineEvent[],
	candidateYears: number[],
	widthPercent: number,
) => {
	for (const year of candidateYears) {
		for (let lane = 0; lane < MAX_EVENT_LANES; lane += 1) {
			const rowEvents = events
				.filter((event) => event.year === year && event.lane === lane)
				.sort((left, right) => left.leftPercent - right.leftPercent);
			let cursor = 0;

			for (const event of rowEvents) {
				if (event.leftPercent - cursor >= widthPercent) {
					return {
						year,
						leftPercent: roundPercent(cursor),
						lane,
					};
				}

				cursor = Math.max(cursor, event.leftPercent + event.widthPercent);
			}

			if (100 - cursor >= widthPercent) {
				return {
					year,
					leftPercent: roundPercent(cursor),
					lane,
				};
			}
		}
	}

	return null;
};

export const findAvailableLane = (
	events: TimelineEvent[],
	year: number,
	leftPercent: number,
	widthPercent: number,
	excludedId?: string,
) => {
	const overlappingEvents = events.filter(
		(event) =>
			event.id !== excludedId &&
			event.year === year &&
			doIntervalsOverlap(
				event.leftPercent,
				event.widthPercent,
				leftPercent,
				widthPercent,
			),
	);

	if (overlappingEvents.length === 0) {
		return 0;
	}

	const nextLane =
		Math.max(...overlappingEvents.map((event) => event.lane)) + 1;

	if (nextLane >= MAX_EVENT_LANES) {
		return null;
	}

	const isLaneBlocked = events.some(
		(event) =>
			event.id !== excludedId &&
			event.year === year &&
			event.lane === nextLane &&
			doIntervalsOverlap(
				event.leftPercent,
				event.widthPercent,
				leftPercent,
				widthPercent,
			),
	);

	if (isLaneBlocked) {
		return null;
	}

	return nextLane;
};
