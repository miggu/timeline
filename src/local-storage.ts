import {
	getDatePosition,
	getDaysInYear,
	toTimelineEventRecord,
} from "./timeline";
import type { ThemeMode, TimelineEvent } from "./types";

const THEME_STORAGE_KEY = "timeline-theme";
const EVENTS_STORAGE_KEY = "timeline-events";

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

type StoredTimelineEventRecord = {
	id: string;
	colorIndex: number;
	label: string;
	lane: number;
	dateEnd: string;
	dateStart: string;
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

const isTimelineEventRecord = (
	value: unknown,
): value is StoredTimelineEventRecord => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const event = value as StoredTimelineEventRecord;

	return (
		typeof event.id === "string" &&
		typeof event.dateStart === "string" &&
		typeof event.dateEnd === "string" &&
		typeof event.colorIndex === "number" &&
		typeof event.label === "string" &&
		typeof event.lane === "number"
	);
};

const normalizeTimelineEventRecord = (
	event: StoredTimelineEventRecord,
): TimelineEvent | null => {
	const startDate = getDatePosition(event.dateStart);
	const endDate = getDatePosition(event.dateEnd);

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

	if (Array.isArray(storedValue) && storedValue.every(isTimelineEventRecord)) {
		const normalizedEvents = storedValue
			.map(normalizeTimelineEventRecord)
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
};

export const clearStoredTimelineData = () => {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify([]));
};
