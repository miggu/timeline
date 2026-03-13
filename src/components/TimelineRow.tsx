import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { EventBlock } from "./EventBlock";
import type { ResizeEdge, TimelineEvent } from "../timeline";

const WeekCell: React.FC<{ weekNumber: number; year: number }> = ({
	weekNumber,
	year,
}) => {
	const { setNodeRef, isOver } = useDroppable({
		id: `week-${year}-${weekNumber}`,
	});

	return (
		<div
			ref={setNodeRef}
			className="week-segment"
			data-week={weekNumber}
			style={{
				backgroundColor: isOver ? "var(--track-border)" : "transparent",
				transition: "background-color 0.2s ease",
			}}
		/>
	);
};

interface TimelineRowProps {
	year: number;
	events?: TimelineEvent[];
	activeResizeId: string | null;
	onResizeStart: (
		id: string,
		edge: ResizeEdge,
		clientX: number,
		trackWidth: number,
	) => void;
}

export const TimelineRow: React.FC<TimelineRowProps> = ({
	year,
	events = [],
	activeResizeId,
	onResizeStart,
}) => {
	return (
		<div className="timeline-row" id={`row-${year}`}>
			<div
				style={{
					fontWeight: "bold",
					marginBottom: "0.5rem",
					color: "var(--text-primary)",
					textAlign: "left",
					paddingLeft: "0.5rem",
				}}
			>
				{year}
			</div>
			<div className="month-markers">
				<span>Jan</span>
				<span>Feb</span>
				<span>Mar</span>
				<span>Apr</span>
				<span>May</span>
				<span>Jun</span>
				<span>Jul</span>
				<span>Aug</span>
				<span>Sep</span>
				<span>Oct</span>
				<span>Nov</span>
				<span>Dec</span>
			</div>
			<div className="track">
				{Array.from({ length: 52 }, (_, i) => (
					<WeekCell key={i} year={year} weekNumber={i + 1} />
				))}

				{events.map((event) => (
					<EventBlock
						key={event.id}
						{...event}
						isResizeActive={activeResizeId === event.id}
						onResizeStart={onResizeStart}
					/>
				))}
			</div>
		</div>
	);
};
