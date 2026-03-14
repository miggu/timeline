import { useDroppable } from "@dnd-kit/core";
import { EventBlock } from "./EventBlock";
import type { ResizeEdge, TimelineEvent } from "../types";
import { getMonthStartPercent } from "../timeline";

const MONTH_LABELS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;

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
				{MONTH_LABELS.map((monthLabel, monthIndex) => (
					<span
						key={monthLabel}
						className="timeline-row__month"
						style={{ left: `${getMonthStartPercent(year, monthIndex)}%` }}
					>
						{monthLabel}
					</span>
				))}
			</div>
			<div className="timeline-row__track">
				<div className="timeline-row__year-slot" aria-hidden="true">
					<div className="timeline-row__year-marker">
						<span className="timeline-row__year-text">{year}</span>
					</div>
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
