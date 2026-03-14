import type { Ref } from "react";
import { useDroppable } from "@dnd-kit/core";
import { EventBlock, EventBlockPreview } from "./EventBlock";
import type { ResizeEdge, TimelineEvent } from "../types";
import { getDayPositionPercent, getMonthStartPercent } from "../timeline";

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
	onCreateEvent,
}: {
	weekNumber: number;
	year: number;
	onCreateEvent: (year: number, weekNumber: number) => void;
}) {
	const { setNodeRef, isOver } = useDroppable({
		id: `week-${year}-${weekNumber}`,
	});

	return (
		<div
			ref={setNodeRef}
			className={`timeline-row__week${isOver ? " timeline-row__week--active" : ""}`}
			data-week={weekNumber}
			role="button"
			tabIndex={0}
			onClick={() => onCreateEvent(year, weekNumber)}
			onKeyDown={(event) => {
				if (event.key !== "Enter" && event.key !== " ") {
					return;
				}

				event.preventDefault();
				onCreateEvent(year, weekNumber);
			}}
		/>
	);
}

interface TimelineRowProps {
	year: number;
	events?: TimelineEvent[];
	previewEvent: TimelineEvent | null;
	nowDay: number | null;
	activeResizeId: string | null;
	editingEventId: string | null;
	suppressedEditEventId: string | null;
	rowRef?: Ref<HTMLDivElement>;
	onCreateEvent: (year: number, weekNumber: number) => void;
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
	previewEvent,
	nowDay,
	activeResizeId,
	editingEventId,
	suppressedEditEventId,
	rowRef,
	onCreateEvent,
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
		<div ref={rowRef} className="timeline-row" id={`row-${year}`}>
			<div className="timeline-row__months">
				{nowDay ? (
					<span
						className="timeline-row__now"
						style={{ left: `${getDayPositionPercent(year, nowDay)}%` }}
						aria-hidden="true"
					/>
				) : null}
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
					<WeekCell
						key={i}
						year={year}
						weekNumber={i + 1}
						onCreateEvent={onCreateEvent}
					/>
				))}
				{previewEvent ? (
					<EventBlockPreview
						key={`preview-${previewEvent.id}`}
						year={previewEvent.year}
						beginDay={previewEvent.beginDay}
						endDay={previewEvent.endDay}
						colorIndex={previewEvent.colorIndex}
						label={previewEvent.label}
						lane={previewEvent.lane}
					/>
				) : null}

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
