export interface TimelineEvent {
	id: string;
	year: number;
	beginDay: number;
	endDay: number;
	colorIndex: number;
	label: string;
	lane: number;
}

export type ResizeEdge = "start" | "end";
export type ThemeMode = "light" | "dark";

export interface TimelineExportData {
	exportedAt: string;
	events: TimelineEvent[];
}
