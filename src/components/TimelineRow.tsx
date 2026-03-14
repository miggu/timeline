import { useDroppable } from "@dnd-kit/core";
import { EventBlock } from "./EventBlock";
import type { ResizeEdge, TimelineEvent } from "../types";

function WeekCell({
	weekNumber,
	year,
}: {
	weekNumber: number;
	year: number;
}) {
	const { setNodeRef, isOver } = useDroppable({
		id: `week-${year}-${weekNumber}`,
	});

	return (
		<div
			ref={setNodeRef}
			className={`timeline-row__week${isOver ? " timeline-row__week--active" : ""}`}
			data-week={weekNumber}
		/>
	);
}

interface TimelineRowProps {
	year: number;
	events?: TimelineEvent[];
	activeResizeId: string | null;
	editingEventId: string | null;
	suppressedEditEventId: string | null;
	onCancelEditing: (id: string) => void;
	onCommitLabel: (id: string, label: string) => void;
	onDeleteEvent: (id: string) => void;
	onResizeStart: (
		id: string,
		edge: ResizeEdge,
		clientX: number,
		trackWidth: number,
	) => void;
	onStartEditing: (id: string) => void;
}

export function TimelineRow({
	year,
	events = [],
	activeResizeId,
	editingEventId,
	suppressedEditEventId,
	onCancelEditing,
	onCommitLabel,
	onDeleteEvent,
	onResizeStart,
	onStartEditing,
}: TimelineRowProps) {
	const sortedEvents = [...events].sort(
		(left, right) =>
			left.lane - right.lane || left.beginDay - right.beginDay,
	);

	return (
		<div className="timeline-row" id={`row-${year}`}>
			<div className="timeline-row__months">
				<span className="timeline-row__month">Jan</span>
				<span className="timeline-row__month">Feb</span>
				<span className="timeline-row__month">Mar</span>
				<span className="timeline-row__month">Apr</span>
				<span className="timeline-row__month">May</span>
				<span className="timeline-row__month">Jun</span>
				<span className="timeline-row__month">Jul</span>
				<span className="timeline-row__month">Aug</span>
				<span className="timeline-row__month">Sep</span>
				<span className="timeline-row__month">Oct</span>
				<span className="timeline-row__month">Nov</span>
				<span className="timeline-row__month">Dec</span>
			</div>
			<div className="timeline-row__track">
				<div className="timeline-row__year-marker" aria-hidden="true">
					<span className="timeline-row__year-text">{year}</span>
				</div>
				{Array.from({ length: 52 }, (_, i) => (
					<WeekCell key={i} year={year} weekNumber={i + 1} />
				))}

				{sortedEvents.map((event) => (
					<EventBlock
						key={event.id}
						{...event}
						isEditing={editingEventId === event.id}
						isResizeActive={activeResizeId === event.id}
						suppressEdit={suppressedEditEventId === event.id}
						onCancelEditing={onCancelEditing}
						onCommitLabel={onCommitLabel}
						onDelete={onDeleteEvent}
						onResizeStart={onResizeStart}
						onStartEditing={onStartEditing}
					/>
				))}
			</div>
		</div>
	);
}
