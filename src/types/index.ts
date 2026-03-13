export interface TimelineEvent {
	id: string;
	year: number;
	leftPercent: number;
	widthPercent: number;
	colorIndex: number;
}

export type ResizeEdge = "start" | "end";
