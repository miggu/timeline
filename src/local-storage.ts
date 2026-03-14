import { MIN_EVENT_DURATION_DAYS, getDaysInYear } from "./timeline";
import type { ThemeMode, TimelineEvent } from "./types";

const THEME_STORAGE_KEY = "timeline-theme";
const EVENTS_STORAGE_KEY = "timeline-events";
const OLDEST_YEAR_STORAGE_KEY = "timeline-oldest-year";

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

type StoredTimelineEvent = {
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

const isTimelineEvent = (value: unknown): value is StoredTimelineEvent => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const event = value as StoredTimelineEvent;
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

const normalizeTimelineEvent = (event: StoredTimelineEvent): TimelineEvent => {
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

const getOldestEventYear = (events: TimelineEvent[]) => {
	if (events.length === 0) {
		return null;
	}

	return events.reduce(
		(oldestYear, event) => Math.min(oldestYear, event.year),
		events[0].year,
	);
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

export const getStoredOldestYear = (
	defaultOldestYear: number,
	currentYear: number,
) => {
	const oldestEventYear = getOldestEventYear(getStoredEvents());
	const storedValue = readStoredJson(OLDEST_YEAR_STORAGE_KEY);

	if (typeof storedValue !== "number" || !Number.isFinite(storedValue)) {
		return oldestEventYear === null
			? defaultOldestYear
			: Math.min(defaultOldestYear, oldestEventYear);
	}

	const storedOldestYear = clamp(Math.round(storedValue), 1, currentYear);

	return oldestEventYear === null
		? storedOldestYear
		: Math.min(storedOldestYear, oldestEventYear);
};

export const setStoredOldestYear = (oldestYear: number) => {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(
		OLDEST_YEAR_STORAGE_KEY,
		JSON.stringify(oldestYear),
	);
};

export const getStoredEvents = () => {
	const storedValue = readStoredJson(EVENTS_STORAGE_KEY);

	if (Array.isArray(storedValue) && storedValue.every(isTimelineEvent)) {
		return storedValue.map(normalizeTimelineEvent);
	}

	return DEFAULT_EVENTS;
};

export const setStoredEvents = (events: TimelineEvent[]) => {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
};

export const clearStoredTimelineData = () => {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify([]));
	window.localStorage.removeItem(OLDEST_YEAR_STORAGE_KEY);
};
