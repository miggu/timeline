export interface TimelineEvent {
	id: string;
	year: number;
	leftPercent: number;
	widthPercent: number;
	colorIndex: number;
	label: string;
	lane: number;
}

export type ResizeEdge = "start" | "end";
export type ThemeMode = "light" | "dark";
