import React from "react";
import { useDraggable } from "@dnd-kit/core";

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
}

export const EventBlock: React.FC<EventBlockProps> = ({
	id,
	leftPercent,
	widthPercent,
}) => {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: id,
		});

	const style: React.CSSProperties = {
		left: `${leftPercent}%`,
		width: `${widthPercent}%`,
		transform: transform
			? `translate3d(${transform.x}px, ${transform.y}px, 0)`
			: undefined,
		zIndex: isDragging ? 100 : 10,
		opacity: isDragging ? 0.8 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			className="event-block"
			style={style}
			{...listeners}
			{...attributes}
		>
			<div className="resize-handle left">
				<ChevronLeft />
			</div>
			<div className="resize-handle right">
				<ChevronRight />
			</div>
		</div>
	);
};
