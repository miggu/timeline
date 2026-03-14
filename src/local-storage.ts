import type { ThemeMode, TimelineEvent } from "./types";

const THEME_STORAGE_KEY = "timeline-theme";
const EVENTS_STORAGE_KEY = "timeline-events";
const YEARS_STORAGE_KEY = "timeline-years-to-display";

const YEAR_OPTIONS = new Set([1, 3, 5, 9]);

export const DEFAULT_YEARS_TO_DISPLAY = 3;

export const DEFAULT_EVENTS: TimelineEvent[] = [
	{
		id: "e1",
		year: 2024,
		leftPercent: 10,
		widthPercent: 15,
		colorIndex: 0,
		label: "",
		lane: 0,
	},
	{
		id: "e2",
		year: 2025,
		leftPercent: 75,
		widthPercent: 12,
		colorIndex: 1,
		label: "",
		lane: 0,
	},
	{
		id: "e3",
		year: 2019,
		leftPercent: 30,
		widthPercent: 8,
		colorIndex: 2,
		label: "",
		lane: 0,
	},
];

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

const isTimelineEvent = (value: unknown): value is TimelineEvent => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const event = value as Partial<TimelineEvent>;

	return (
		typeof event.id === "string" &&
		typeof event.year === "number" &&
		typeof event.leftPercent === "number" &&
		typeof event.widthPercent === "number" &&
		typeof event.colorIndex === "number" &&
		(typeof event.label === "string" || typeof event.label === "undefined") &&
		(typeof event.lane === "number" || typeof event.lane === "undefined")
	);
};

const normalizeTimelineEvent = (event: TimelineEvent): TimelineEvent => ({
	...event,
	label: typeof event.label === "string" ? event.label : "",
	lane: typeof event.lane === "number" ? event.lane : 0,
});

export const getStoredThemeMode = (): ThemeMode => {
	if (typeof window === "undefined") {
		return "light";
	}

	const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

	if (storedTheme === "light" || storedTheme === "dark") {
		return storedTheme;
	}

	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
};

export const setStoredThemeMode = (themeMode: ThemeMode) => {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
};

export const getStoredYearsToDisplay = () => {
	const storedValue = readStoredJson(YEARS_STORAGE_KEY);

	if (typeof storedValue === "number" && YEAR_OPTIONS.has(storedValue)) {
		return storedValue;
	}

	return DEFAULT_YEARS_TO_DISPLAY;
};

export const setStoredYearsToDisplay = (yearsToDisplay: number) => {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(
		YEARS_STORAGE_KEY,
		JSON.stringify(yearsToDisplay),
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
