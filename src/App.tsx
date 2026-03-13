import React, { useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { TimelineRow } from "./components/TimelineRow";
import { SettingsPanel } from "./components/SettingsPanel";

const App: React.FC = () => {
	const currentYear = 2026;
	const [yearsToDisplay, setYearsToDisplay] = useState<number>(3); // Default to 3 years

	// Calculate the array of years to map over
	const years = Array.from(
		{ length: yearsToDisplay },
		(_, i) => currentYear - (yearsToDisplay - 1) + i,
	);

	const [events, setEvents] = useState([
		{ id: "e1", year: 2024, leftPercent: 10, widthPercent: 15 },
		{ id: "e2", year: 2025, leftPercent: 75, widthPercent: 12 },
		{ id: "e3", year: 2019, leftPercent: 30, widthPercent: 8 },
	]);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		// If dropped over a valid week cell
		if (over && over.id) {
			const dropId = String(over.id); // e.g. "week-2024-5"
			const match = dropId.match(/week-(\d+)-(\d+)/);

			if (match) {
				const dropYear = parseInt(match[1]);
				const dropWeek = parseInt(match[2]);

				// Very basic recalculation: move block left edge to the dropped week's position
				// Since we have 52 weeks, each week is ~1.92% wide
				const newLeftPercent = ((dropWeek - 1) / 52) * 100;

				setEvents((prev) =>
					prev.map((ev) =>
						ev.id === active.id
							? { ...ev, year: dropYear, leftPercent: newLeftPercent }
							: ev,
					),
				);
			}
		}
	};

	return (
		<div className="timeline-card">
			<SettingsPanel
				yearsToDisplay={yearsToDisplay}
				setYearsToDisplay={setYearsToDisplay}
			/>
			<h1>THIS IS YOUR LIFE.</h1>

			<div className="subtitle">
				<span>
					A retrospective look at what you have been doing all this time.
				</span>
			</div>

			<DndContext onDragEnd={handleDragEnd}>
				<div className="timeline-container">
					{years.map((year) => (
						<TimelineRow
							key={year}
							year={year}
							events={events.filter((e) => e.year === year)}
						/>
					))}
				</div>
			</DndContext>

			<div className="controls-container">
				<button className="btn-primary">Log Event</button>
				<div className="pagination">
					<button className="btn-icon">←</button>
					<button className="btn-icon">Next →</button>
				</div>
			</div>
		</div>
	);
};

export default App;
