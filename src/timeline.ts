import type { ResizeEdge, TimelineEvent, TimelineEventRecord } from "./types";

export const WEEK_COUNT = 52;
export const YEAR_PLACEHOLDER_COLUMN_COUNT = 1;
export const TRACK_COLUMN_COUNT = WEEK_COUNT + YEAR_PLACEHOLDER_COLUMN_COUNT;
export const MAX_EVENT_LANES = 3;
export const EVENT_BLOCK_TOP = 10;
export const EVENT_BLOCK_HEIGHT = 24;
export const EVENT_LANE_GAP = 8;
export const MIN_EVENT_DURATION_DAYS = 7;
export const LOG_EVENT_DURATION_DAYS = 49;

export const EVENT_COLOR_PALETTE = [
	{ color: "#5679A6", glow: "rgba(86, 121, 166, 0.28)" },
	{ color: "#6394BF", glow: "rgba(99, 148, 191, 0.28)" },
	{ color: "#62733F", glow: "rgba(98, 115, 63, 0.28)" },
	{ color: "#D99B29", glow: "rgba(217, 155, 41, 0.28)" },
	{ color: "#A6771F", glow: "rgba(166, 119, 31, 0.28)" },
] as const;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const roundPercent = (value: number) => Number(value.toFixed(6));
const getDayOffset = (year: number, day: number) =>
	(clamp(day, 1, getDaysInYear(year)) - 1) / getDaysInYear(year);
const getTrackPositionPercent = (year: number, day: number) =>
	roundPercent(
		getTrackPlaceholderPercent() +
			getDayOffset(year, day) * getTrackTimelinePercent(),
	);
const doIntervalsOverlap = (
	beginA: number,
	endA: number,
	beginB: number,
	endB: number,
) => beginA <= endB && beginB <= endA;

export const getDaysInYear = (year: number) =>
	new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;

export const getDayOfYear = (date: Date) => {
	const startOfYear = new Date(date.getFullYear(), 0, 1);

	return (
		Math.floor(
			(date.getTime() - startOfYear.getTime()) / MILLISECONDS_PER_DAY,
		) + 1
	);
};

const getUtcDayOfYear = (year: number, monthIndex: number, day: number) => {
	const startOfYear = Date.UTC(year, 0, 1);
	const timestamp = Date.UTC(year, monthIndex, day);

	return Math.floor((timestamp - startOfYear) / MILLISECONDS_PER_DAY) + 1;
};

export const getTrackPlaceholderPercent = () =>
	roundPercent((YEAR_PLACEHOLDER_COLUMN_COUNT / TRACK_COLUMN_COUNT) * 100);

export const getTrackTimelinePercent = () =>
	roundPercent((WEEK_COUNT / TRACK_COLUMN_COUNT) * 100);

export const getTrackTimelineWidth = (trackWidth: number) =>
	(trackWidth * getTrackTimelinePercent()) / 100;

export const getDayForWeek = (year: number, weekNumber: number) => {
	const dayCount = getDaysInYear(year);

	return clamp(
		Math.round(((clamp(weekNumber, 1, WEEK_COUNT) - 1) / WEEK_COUNT) * dayCount) +
			1,
		1,
		dayCount,
	);
};

const getWeekNumberForDay = (year: number, day: number) => {
	const dayCount = getDaysInYear(year);

	return (
		Math.round(((clamp(day, 1, dayCount) - 1) / dayCount) * WEEK_COUNT) + 1
	);
};

const getDayAfterWeek = (year: number, weekNumber: number) => {
	if (weekNumber >= WEEK_COUNT) {
		return getDaysInYear(year) + 1;
	}

	return getDayForWeek(year, weekNumber + 1);
};

export const getDayForWeekEnd = (year: number, weekNumber: number) =>
	clamp(getDayAfterWeek(year, weekNumber) - 1, 1, getDaysInYear(year));

const snapDayToWeek = (year: number, day: number) => {
	return getDayForWeek(year, getWeekNumberForDay(year, day));
};

const snapDayToWeekEnd = (year: number, day: number) =>
	getDayForWeekEnd(year, getWeekNumberForDay(year, day));

export const getEventDurationDays = (event: TimelineEvent) =>
	event.endDay - event.beginDay + 1;

export const getEventLeftPercent = (year: number, beginDay: number) =>
	getTrackPositionPercent(year, beginDay);

export const getEventWidthPercent = (
	year: number,
	beginDay: number,
	endDay: number,
) =>
	roundPercent(
		((clamp(endDay, beginDay, getDaysInYear(year)) -
			clamp(beginDay, 1, getDaysInYear(year)) +
			1) /
			getDaysInYear(year)) *
			getTrackTimelinePercent(),
	);

export const getMonthStartPercent = (year: number, monthIndex: number) =>
	getTrackPositionPercent(year, getDayOfYear(new Date(year, monthIndex, 1)));

export const getDayPositionPercent = (year: number, day: number) =>
	getTrackPositionPercent(year, day);

export const getIsoDateForDay = (year: number, day: number) =>
	new Date(Date.UTC(year, 0, clamp(day, 1, getDaysInYear(year))))
		.toISOString()
		.slice(0, 10);

export const getDatePosition = (isoDate: string) => {
	const match = isoDate.match(ISO_DATE_PATTERN);

	if (!match) {
		return null;
	}

	const year = Number.parseInt(match[1], 10);
	const month = Number.parseInt(match[2], 10);
	const day = Number.parseInt(match[3], 10);
	const utcDate = new Date(Date.UTC(year, month - 1, day));

	if (
		utcDate.getUTCFullYear() !== year ||
		utcDate.getUTCMonth() !== month - 1 ||
		utcDate.getUTCDate() !== day
	) {
		return null;
	}

	return {
		year,
		dayOfYear: getUtcDayOfYear(year, month - 1, day),
	};
};

export const toTimelineEventRecord = (
	event: TimelineEvent,
): TimelineEventRecord => ({
	id: event.id,
	startDate: getIsoDateForDay(event.year, event.beginDay),
	endDate: getIsoDateForDay(event.year, event.endDay),
	colorIndex: event.colorIndex,
	label: event.label,
	lane: event.lane,
});

const clampEventRange = (
	year: number,
	beginDay: number,
	durationDays: number,
) => {
	const dayCount = getDaysInYear(year);
	const safeDuration = clamp(durationDays, MIN_EVENT_DURATION_DAYS, dayCount);
	const safeBeginDay = clamp(beginDay, 1, dayCount - safeDuration + 1);

	return {
		beginDay: safeBeginDay,
		endDay: safeBeginDay + safeDuration - 1,
	};
};

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
	anchorOffsetDays = 0,
): TimelineEvent => {
	const safeAnchorOffsetDays = clamp(
		anchorOffsetDays,
		0,
		Math.max(getEventDurationDays(event) - 1, 0),
	);
	const nextRange = clampEventRange(
		year,
		snapDayToWeek(
			year,
			getDayForWeek(year, weekNumber) - safeAnchorOffsetDays,
		),
		getEventDurationDays(event),
	);

	return {
		...event,
		year,
		beginDay: nextRange.beginDay,
		endDay: nextRange.endDay,
		lane,
	};
};

export const resizeTimelineEvent = (
	event: TimelineEvent,
	edge: ResizeEdge,
	deltaDays: number,
): TimelineEvent => {
	if (edge === "start") {
		const nextBeginDay = clamp(
			snapDayToWeek(event.year, event.beginDay + deltaDays),
			1,
			event.endDay - MIN_EVENT_DURATION_DAYS + 1,
		);

		return {
			...event,
			beginDay: nextBeginDay,
		};
	}

	const nextEndDay = clamp(
		snapDayToWeekEnd(event.year, event.endDay + deltaDays),
		event.beginDay + MIN_EVENT_DURATION_DAYS - 1,
		getDaysInYear(event.year),
	);

	return {
		...event,
		endDay: nextEndDay,
	};
};

export const findNextEventPlacement = (
	events: TimelineEvent[],
	candidateYears: number[],
	durationDays: number,
) => {
	for (const year of candidateYears) {
		const dayCount = getDaysInYear(year);

		for (let lane = 0; lane < MAX_EVENT_LANES; lane += 1) {
			const rowEvents = events
				.filter((event) => event.year === year && event.lane === lane)
				.sort((left, right) => left.beginDay - right.beginDay);
			let cursor = 1;

			for (const event of rowEvents) {
				if (event.beginDay - cursor >= durationDays) {
					return {
						year,
						beginDay: cursor,
						endDay: cursor + durationDays - 1,
						lane,
					};
				}

				cursor = Math.max(cursor, event.endDay + 1);
			}

			if (dayCount - cursor + 1 >= durationDays) {
				return {
					year,
					beginDay: cursor,
					endDay: cursor + durationDays - 1,
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
	beginDay: number,
	endDay: number,
	excludedId?: string,
) => {
	const overlappingEvents = events.filter(
		(event) =>
			event.id !== excludedId &&
			event.year === year &&
			doIntervalsOverlap(
				event.beginDay,
				event.endDay,
				beginDay,
				endDay,
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
				event.beginDay,
				event.endDay,
				beginDay,
				endDay,
			),
	);

	if (isLaneBlocked) {
		return null;
	}

	return nextLane;
};
