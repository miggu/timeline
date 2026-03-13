import React from "react";
import { useDraggable } from "@dnd-kit/core";
import type { ResizeEdge } from "../types";
import { getEventPaletteColor } from "../timeline";

// SVG Icons
const ChevronLeft = () => (
	<svg viewBox="0 0 24 24" className="timeline-event__icon">
		<path d="M15 18l-6-6 6-6" />
	</svg>
);
const ChevronRight = () => (
	<svg viewBox="0 0 24 24" className="timeline-event__icon">
		<path d="M9 18l6-6-6-6" />
	</svg>
);

interface EventBlockProps {
	id: string;
	leftPercent: number;
	widthPercent: number;
	colorIndex: number;
	isResizeActive: boolean;
	onResizeStart: (
		id: string,
		edge: ResizeEdge,
		clientX: number,
		trackWidth: number,
	) => void;
}

interface EventBlockOverlayProps {
	width: number;
	height: number;
	colorIndex: number;
}

type EventBlockStyle = React.CSSProperties & {
	"--event-color"?: string;
	"--event-glow"?: string;
};

const EventBlockChrome = () => (
	<>
		<div className="timeline-event__handle timeline-event__handle--start">
			<ChevronLeft />
		</div>
		<div className="timeline-event__handle timeline-event__handle--end">
			<ChevronRight />
		</div>
	</>
);

export const EventBlock: React.FC<EventBlockProps> = ({
	id,
	leftPercent,
	widthPercent,
	colorIndex,
	isResizeActive,
	onResizeStart,
}) => {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: id,
			disabled: isResizeActive,
		});

	const handleResizePointerDown =
		(edge: ResizeEdge) => (event: React.PointerEvent<HTMLDivElement>) => {
			event.preventDefault();
			event.stopPropagation();

			const trackElement = event.currentTarget.closest(".timeline-row__track");

			if (!(trackElement instanceof HTMLElement)) {
				return;
			}

			onResizeStart(
				id,
				edge,
				event.clientX,
				trackElement.getBoundingClientRect().width,
			);
		};

	const paletteColor = getEventPaletteColor(colorIndex);

	const style: EventBlockStyle = {
		left: `${leftPercent}%`,
		width: `${widthPercent}%`,
		transform: transform
			? `translate3d(${transform.x}px, 0, 0)`
			: undefined,
		zIndex: isDragging ? 100 : 10,
		opacity: isDragging ? 0 : 1,
		transition: isDragging ? "none" : undefined,
		"--event-color": paletteColor.color,
		"--event-glow": paletteColor.glow,
	};

	return (
		<div
			ref={setNodeRef}
			className={`timeline-event${isResizeActive ? " timeline-event--resizing" : ""}`}
			style={style}
			{...listeners}
			{...attributes}
		>
			<div
				className="timeline-event__handle timeline-event__handle--start"
				onPointerDown={handleResizePointerDown("start")}
			>
				<ChevronLeft />
			</div>
			<div
				className="timeline-event__handle timeline-event__handle--end"
				onPointerDown={handleResizePointerDown("end")}
			>
				<ChevronRight />
			</div>
		</div>
	);
};

export const EventBlockOverlay: React.FC<EventBlockOverlayProps> = ({
	width,
	height,
	colorIndex,
}) => {
	const paletteColor = getEventPaletteColor(colorIndex);
	const style: EventBlockStyle = {
		width,
		height,
		"--event-color": paletteColor.color,
		"--event-glow": paletteColor.glow,
	};

	return (
		<div className="timeline-event timeline-event--overlay" style={style}>
			<EventBlockChrome />
		</div>
	);
};
