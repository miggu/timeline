import React, { useEffect, useRef, useState } from "react";
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
	label: string;
	isEditing: boolean;
	isResizeActive: boolean;
	onCancelEditing: (id: string) => void;
	onCommitLabel: (id: string, label: string) => void;
	onResizeStart: (
		id: string,
		edge: ResizeEdge,
		clientX: number,
		trackWidth: number,
	) => void;
	onStartEditing: (id: string) => void;
}

interface EventBlockOverlayProps {
	width: number;
	height: number;
	colorIndex: number;
	label: string;
}

type EventBlockStyle = React.CSSProperties & {
	"--event-color"?: string;
	"--event-glow"?: string;
};

export const EventBlock: React.FC<EventBlockProps> = ({
	id,
	leftPercent,
	widthPercent,
	colorIndex,
	label,
	isEditing,
	isResizeActive,
	onCancelEditing,
	onCommitLabel,
	onResizeStart,
	onStartEditing,
}) => {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const skipBlurCommitRef = useRef(false);
	const [draftLabel, setDraftLabel] = useState(label);
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: id,
			disabled: isResizeActive || isEditing,
		});

	useEffect(() => {
		setDraftLabel(label);
	}, [label]);

	useEffect(() => {
		if (!isEditing) {
			return;
		}

		inputRef.current?.focus();
		inputRef.current?.select();
	}, [isEditing]);

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

	const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
		if (isDragging || isEditing || isResizeActive) {
			return;
		}

		if (
			event.target instanceof Element &&
			event.target.closest(".timeline-event__handle")
		) {
			return;
		}

		onStartEditing(id);
	};

	const commitLabel = () => {
		if (skipBlurCommitRef.current) {
			skipBlurCommitRef.current = false;
			return;
		}

		onCommitLabel(id, draftLabel);
	};

	const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			event.preventDefault();
			commitLabel();
			return;
		}

		if (event.key !== "Escape") {
			return;
		}

		event.preventDefault();
		skipBlurCommitRef.current = true;
		setDraftLabel(label);
		onCancelEditing(id);
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
			className={`timeline-event${
				isEditing ? " timeline-event--editing" : ""
			}${isResizeActive ? " timeline-event--resizing" : ""}`}
			style={style}
			onClick={handleClick}
			{...listeners}
			{...attributes}
		>
			<div
				className="timeline-event__handle timeline-event__handle--start"
				onPointerDown={handleResizePointerDown("start")}
			>
				<ChevronLeft />
			</div>
			<div className="timeline-event__content">
				{isEditing ? (
					<input
						ref={inputRef}
						className="timeline-event__input"
						type="text"
						value={draftLabel}
						onBlur={commitLabel}
						onChange={({ target }) => setDraftLabel(target.value)}
						onClick={(event) => event.stopPropagation()}
						onKeyDown={handleInputKeyDown}
						placeholder="Add text"
					/>
				) : label ? (
					<span className="timeline-event__label">{label}</span>
				) : (
					<span className="timeline-event__placeholder">Add text</span>
				)}
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
	label,
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
			<div className="timeline-event__handle timeline-event__handle--start">
				<ChevronLeft />
			</div>
			<div className="timeline-event__content">
				{label ? (
					<span className="timeline-event__label">{label}</span>
				) : (
					<span className="timeline-event__placeholder">Add text</span>
				)}
			</div>
			<div className="timeline-event__handle timeline-event__handle--end">
				<ChevronRight />
			</div>
		</div>
	);
};
