import {
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEvent,
	type MouseEvent,
	type PointerEvent,
} from "react";
import { useDraggable } from "@dnd-kit/core";
import type { ResizeEdge } from "../types";
import {
	getEventLaneTop,
	getEventLeftPercent,
	getEventPaletteColor,
	getEventWidthPercent,
} from "../timeline";

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
	year: number;
	beginDay: number;
	endDay: number;
	colorIndex: number;
	label: string;
	lane: number;
	isEditing: boolean;
	isResizeActive: boolean;
	suppressEdit: boolean;
	onCancelEditing: (id: string) => void;
	onCommitLabel: (id: string, label: string) => void;
	onDelete: (id: string) => void;
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

type EventBlockStyle = CSSProperties & {
	"--event-color"?: string;
	"--event-glow"?: string;
};

const getEventBlockPositionStyle = (
	year: number,
	beginDay: number,
	endDay: number,
	lane: number,
): EventBlockStyle => ({
	left: `${getEventLeftPercent(year, beginDay)}%`,
	top: `${getEventLaneTop(lane)}px`,
	width: `${getEventWidthPercent(year, beginDay, endDay)}%`,
});

export function EventBlock({
	id,
	year,
	beginDay,
	endDay,
	colorIndex,
	label,
	lane,
	isEditing,
	isResizeActive,
	suppressEdit,
	onCancelEditing,
	onCommitLabel,
	onDelete,
	onResizeStart,
	onStartEditing,
}: EventBlockProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const skipBlurCommitRef = useRef(false);
	const suppressNextEditRef = useRef(false);
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
		(edge: ResizeEdge) => (event: PointerEvent<HTMLDivElement>) => {
			event.preventDefault();
			event.stopPropagation();
			suppressNextEditRef.current = true;

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

	const handleClick = (event: MouseEvent<HTMLDivElement>) => {
		if (isDragging || isEditing || isResizeActive || suppressEdit) {
			return;
		}

		if (suppressNextEditRef.current) {
			suppressNextEditRef.current = false;
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

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (isEditing || isResizeActive) {
			return;
		}

		if (event.key === "Enter" || event.key === " " || event.key === "F2") {
			event.preventDefault();
			onStartEditing(id);
		}
	};

	const commitLabel = () => {
		if (skipBlurCommitRef.current) {
			skipBlurCommitRef.current = false;
			return;
		}

		onCommitLabel(id, draftLabel);
	};

	const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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

	const handleDeletePointerDown = (
		event: PointerEvent<HTMLButtonElement>,
	) => {
		event.preventDefault();
		event.stopPropagation();
		onDelete(id);
	};

	const handleDeleteKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key !== "Enter" && event.key !== " ") {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		onDelete(id);
	};

	const handleHandleClick = (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		suppressNextEditRef.current = false;
	};

	const paletteColor = getEventPaletteColor(colorIndex);

	const style: EventBlockStyle = {
		...getEventBlockPositionStyle(year, beginDay, endDay, lane),
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
			{...listeners}
			{...attributes}
			className={`timeline-event${
				isEditing ? " timeline-event--editing" : ""
			}${isResizeActive ? " timeline-event--resizing" : ""}`}
			style={style}
			role="button"
			tabIndex={isEditing ? -1 : 0}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
		>
			{isEditing && !isResizeActive ? (
				<div
					className="timeline-event__toolbar"
					onClick={(event) => event.stopPropagation()}
					onPointerDown={(event) => event.stopPropagation()}
				>
					<button
						className="timeline-event__toolbar-button timeline-event__toolbar-button--danger"
						type="button"
						onPointerDown={handleDeletePointerDown}
						onKeyDown={handleDeleteKeyDown}
					>
						Delete
					</button>
				</div>
			) : null}
			<div
				className="timeline-event__handle timeline-event__handle--start"
				onClick={handleHandleClick}
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
				onClick={handleHandleClick}
				onPointerDown={handleResizePointerDown("end")}
			>
				<ChevronRight />
			</div>
		</div>
	);
}

interface EventBlockPreviewProps {
	year: number;
	beginDay: number;
	endDay: number;
	colorIndex: number;
	label: string;
	lane: number;
}

export function EventBlockPreview({
	year,
	beginDay,
	endDay,
	colorIndex,
	label,
	lane,
}: EventBlockPreviewProps) {
	const paletteColor = getEventPaletteColor(colorIndex);
	const style: EventBlockStyle = {
		...getEventBlockPositionStyle(year, beginDay, endDay, lane),
		"--event-color": paletteColor.color,
		"--event-glow": paletteColor.glow,
	};

	return (
		<div className="timeline-event timeline-event--preview" style={style} aria-hidden="true">
			<div className="timeline-event__content">
				{label ? (
					<span className="timeline-event__label">{label}</span>
				) : (
					<span className="timeline-event__placeholder">Add text</span>
				)}
			</div>
		</div>
	);
}

export function EventBlockOverlay({
	width,
	height,
	colorIndex,
	label,
}: EventBlockOverlayProps) {
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
}
