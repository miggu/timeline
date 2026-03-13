import React from "react";
import { useDraggable } from "@dnd-kit/core";
import type { ResizeEdge } from "../timeline";

// SVG Icons
const ChevronLeft = () => (
	<svg viewBox="0 0 24 24" className="icon">
		<path d="M15 18l-6-6 6-6" />
	</svg>
);
const ChevronRight = () => (
	<svg viewBox="0 0 24 24" className="icon">
		<path d="M9 18l6-6-6-6" />
	</svg>
);

interface EventBlockProps {
	id: string;
	leftPercent: number;
	widthPercent: number;
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
}

const EventBlockChrome = () => (
	<>
		<div className="resize-handle left">
			<ChevronLeft />
		</div>
		<div className="resize-handle right">
			<ChevronRight />
		</div>
	</>
);

export const EventBlock: React.FC<EventBlockProps> = ({
	id,
	leftPercent,
	widthPercent,
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

			const trackElement = event.currentTarget.closest(".track");

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

	const style: React.CSSProperties = {
		left: `${leftPercent}%`,
		width: `${widthPercent}%`,
		transform: transform
			? `translate3d(${transform.x}px, 0, 0)`
			: undefined,
		zIndex: isDragging ? 100 : 10,
		opacity: isDragging ? 0 : 1,
		transition: isDragging ? "none" : undefined,
	};

	return (
		<div
			ref={setNodeRef}
			className={`event-block${isResizeActive ? " is-resizing" : ""}`}
			style={style}
			{...listeners}
			{...attributes}
		>
			<div
				className="resize-handle left"
				onPointerDown={handleResizePointerDown("start")}
			>
				<ChevronLeft />
			</div>
			<div
				className="resize-handle right"
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
}) => {
	return (
		<div
			className="event-block event-block-overlay"
			style={{
				width,
				height,
			}}
		>
			<EventBlockChrome />
		</div>
	);
};
