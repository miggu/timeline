import {
	MIN_EVENT_DURATION_DAYS,
	getDatePosition,
	getDaysInYear,
	toTimelineEventRecord,
} from "./timeline";
import type { ThemeMode, TimelineEvent } from "./types";

const THEME_STORAGE_KEY = "timeline-theme";
const EVENTS_STORAGE_KEY = "timeline-events";
const LEGACY_OLDEST_YEAR_STORAGE_KEY = "timeline-oldest-year";

export const DEFAULT_EVENTS: TimelineEvent[] = [
	{
		id: "e1",
		year: 2024,
		beginDay: 37,
		endDay: 91,
		colorIndex: 0,
		label: "",
		lane: 0,
	},
	{
		id: "e2",
		year: 2025,
		beginDay: 275,
		endDay: 318,
		colorIndex: 1,
		label: "",
		lane: 0,
	},
	{
		id: "e3",
		year: 2019,
		beginDay: 111,
		endDay: 139,
		colorIndex: 2,
		label: "",
		lane: 0,
	},
];

type LegacyTimelineEvent = {
	id: string;
	year: number;
	colorIndex: number;
	label?: string;
	lane?: number;
	beginDay?: number;
	endDay?: number;
	leftPercent?: number;
	widthPercent?: number;
};

type StoredTimelineEventRecord = {
	id: string;
	colorIndex: number;
	label: string;
	lane: number;
	endDate?: string;
	startDate?: string;
	dateEnd?: string;
	dateStart?: string;
};

const readStoredJson = (storageKey: string) => {
	if (typeof window === "undefined") {
		return null;
	}

	const storedValue = window.localStorage.getItem(storageKey);

	if (!storedValue) {
		return null;
	}

	try {
		return JSON.parse(storedValue) as unknown;
	} catch {
		return null;
	}
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const isLegacyTimelineEvent = (value: unknown): value is LegacyTimelineEvent => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const event = value as LegacyTimelineEvent;
	const hasDayRange =
		typeof event.beginDay === "number" && typeof event.endDay === "number";
	const hasLegacyRange =
		typeof event.leftPercent === "number" &&
		typeof event.widthPercent === "number";

	return (
		typeof event.id === "string" &&
		typeof event.year === "number" &&
		(hasDayRange || hasLegacyRange) &&
		typeof event.colorIndex === "number" &&
		(typeof event.label === "string" || typeof event.label === "undefined") &&
		(typeof event.lane === "number" || typeof event.lane === "undefined")
	);
};

const isTimelineEventRecord = (
	value: unknown,
): value is StoredTimelineEventRecord => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const event = value as StoredTimelineEventRecord;
	const hasDateRange =
		(typeof event.dateStart === "string" &&
			typeof event.dateEnd === "string") ||
		(typeof event.startDate === "string" && typeof event.endDate === "string");

	return (
		typeof event.id === "string" &&
		hasDateRange &&
		typeof event.colorIndex === "number" &&
		typeof event.label === "string" &&
		typeof event.lane === "number"
	);
};

const normalizeLegacyTimelineEvent = (
	event: LegacyTimelineEvent,
): TimelineEvent => {
	const dayCount = getDaysInYear(event.year);
	const label = typeof event.label === "string" ? event.label.trimEnd() : "";
	const lane = typeof event.lane === "number" ? event.lane : 0;

	if (typeof event.beginDay === "number" && typeof event.endDay === "number") {
		const beginDay = clamp(Math.round(event.beginDay), 1, dayCount);
		const endDay = clamp(Math.round(event.endDay), beginDay, dayCount);

		return {
			id: event.id,
			year: event.year,
			beginDay,
			endDay,
			colorIndex: event.colorIndex,
			label,
			lane,
		};
	}

	const durationDays = clamp(
		Math.round(((event.widthPercent ?? 0) / 100) * dayCount),
		MIN_EVENT_DURATION_DAYS,
		dayCount,
	);
	const beginDay = clamp(
		Math.round(((event.leftPercent ?? 0) / 100) * dayCount) + 1,
		1,
		dayCount - durationDays + 1,
	);

	return {
		id: event.id,
		year: event.year,
		beginDay,
		endDay: beginDay + durationDays - 1,
		colorIndex: event.colorIndex,
		label,
		lane,
	};
};

const normalizeTimelineEventRecord = (
	event: StoredTimelineEventRecord,
): TimelineEvent | null => {
	const dateStart = event.dateStart ?? event.startDate;
	const dateEnd = event.dateEnd ?? event.endDate;

	if (!dateStart || !dateEnd) {
		return null;
	}

	const startDate = getDatePosition(dateStart);
	const endDate = getDatePosition(dateEnd);

	if (!startDate || !endDate || startDate.year !== endDate.year) {
		return null;
	}

	const dayCount = getDaysInYear(startDate.year);
	const beginDay = clamp(startDate.dayOfYear, 1, dayCount);
	const endDay = clamp(endDate.dayOfYear, beginDay, dayCount);

	return {
		id: event.id,
		year: startDate.year,
		beginDay,
		endDay,
		colorIndex: event.colorIndex,
		label: event.label.trimEnd(),
		lane: event.lane,
	};
};

const normalizeStoredTimelineEvent = (value: unknown): TimelineEvent | null => {
	if (isTimelineEventRecord(value)) {
		return normalizeTimelineEventRecord(value);
	}

	if (isLegacyTimelineEvent(value)) {
		return normalizeLegacyTimelineEvent(value);
	}

	return null;
};

export const getStoredThemeMode = (): ThemeMode => {
	if (typeof window === "undefined") {
		return "light";
	}

	const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

	if (storedTheme === "light" || storedTheme === "dark") {
		return storedTheme;
	}

	return "light";
};

export const setStoredThemeMode = (themeMode: ThemeMode) => {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
};

export const getStoredEvents = () => {
	const storedValue = readStoredJson(EVENTS_STORAGE_KEY);

	if (Array.isArray(storedValue)) {
		const normalizedEvents = storedValue
			.map(normalizeStoredTimelineEvent)
			.filter((event): event is TimelineEvent => event !== null);

		if (normalizedEvents.length > 0 || storedValue.length === 0) {
			return normalizedEvents;
		}
	}

	return DEFAULT_EVENTS;
};

export const setStoredEvents = (events: TimelineEvent[]) => {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(
		EVENTS_STORAGE_KEY,
		JSON.stringify(events.map(toTimelineEventRecord)),
	);
	window.localStorage.removeItem(LEGACY_OLDEST_YEAR_STORAGE_KEY);
};

export const clearStoredTimelineData = () => {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify([]));
	window.localStorage.removeItem(LEGACY_OLDEST_YEAR_STORAGE_KEY);
};
