import { useEffect, useState } from "react";
import {
	DndContext,
	DragOverlay,
	KeyboardSensor,
	PointerSensor,
	pointerWithin,
	type DragEndEvent,
	type DragStartEvent,
	type Modifier,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { TimelineRow } from "./components/TimelineRow";
import { EventBlockOverlay } from "./components/EventBlock";
import { Settings } from "./components/Settings";
import {
	getStoredEvents,
	getStoredThemeMode,
	getStoredYearsToDisplay,
	setStoredEvents,
	setStoredThemeMode,
	setStoredYearsToDisplay,
} from "./local-storage";
import type { ResizeEdge, ThemeMode, TimelineEvent } from "./types";
import {
	LOG_EVENT_WIDTH_PERCENT,
	findAvailableLane,
	findNextEventPlacement,
	getEventLaneTop,
	moveTimelineEventToWeek,
	resizeTimelineEvent,
} from "./timeline";

interface ActiveDragState {
	id: string;
	width: number;
	height: number;
	lane: number;
}

interface ActiveResizeState {
	id: string;
	edge: ResizeEdge;
	startClientX: number;
	startLeftPercent: number;
	startWidthPercent: number;
	trackWidth: number;
}

const getDropTarget = (id: string) => {
	const match = id.match(/week-(\d+)-(\d+)/);

	if (!match) {
		return null;
	}

	return {
		year: Number.parseInt(match[1], 10),
		weekNumber: Number.parseInt(match[2], 10),
	};
};

function App() {
	const currentYear = 2026;
	const [yearsToDisplay, setYearsToDisplay] = useState<number>(
		getStoredYearsToDisplay,
	);
	const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredThemeMode);

	// Calculate the array of years to map over
	const years = Array.from(
		{ length: yearsToDisplay },
		(_, i) => currentYear - (yearsToDisplay - 1) + i,
	);

	const [events, setEvents] = useState<TimelineEvent[]>(getStoredEvents);
	const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
	const [activeResize, setActiveResize] = useState<ActiveResizeState | null>(
		null,
	);
	const [editingEventId, setEditingEventId] = useState<string | null>(null);
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 6,
			},
		}),
		useSensor(KeyboardSensor),
	);

	const activeEvent = activeDrag
		? events.find((event) => event.id === activeDrag.id) ?? null
		: null;
	const snapDragToRow: Modifier = ({ transform, activeNodeRect, over }) => {
		if (!activeNodeRect || !activeEvent) {
			return transform;
		}

		if (!over) {
			return {
				...transform,
				y: 0,
			};
		}

		const dropTarget = getDropTarget(String(over.id));

		if (!dropTarget) {
			return transform;
		}

		const nextPosition = moveTimelineEventToWeek(
			activeEvent,
			dropTarget.year,
			dropTarget.weekNumber,
			activeEvent.lane,
		);
		const nextLane =
			findAvailableLane(
				events,
				dropTarget.year,
				nextPosition.leftPercent,
				activeEvent.widthPercent,
				activeEvent.id,
			) ?? activeDrag?.lane ?? activeEvent.lane;

		return {
			...transform,
			y: over.rect.top + getEventLaneTop(nextLane) - activeNodeRect.top,
		};
	};

	const handleDragStart = (event: DragStartEvent) => {
		const activeId = String(event.active.id);
		const timelineEvent = events.find((item) => item.id === activeId) ?? null;
		const dragTarget = event.activatorEvent.target;
		const blockElement =
			dragTarget instanceof Element
				? (dragTarget.closest(".timeline-event") as HTMLElement | null)
				: null;
		const trackElement = blockElement?.closest(".timeline-row__track") as
			| HTMLElement
			| null;
		const initialRect =
			event.active.rect.current.initial ?? event.active.rect.current.translated;
		const measuredWidth =
			timelineEvent && trackElement
				? (trackElement.getBoundingClientRect().width * timelineEvent.widthPercent) /
					100
				: initialRect?.width ?? 48;
		const measuredHeight =
			blockElement?.getBoundingClientRect().height ?? initialRect?.height ?? 24;

		setActiveDrag({
			id: activeId,
			width: measuredWidth,
			height: measuredHeight,
			lane: timelineEvent?.lane ?? 0,
		});
		setEditingEventId(null);
	};

	const clearActiveDrag = () => {
		setActiveDrag(null);
	};

	const clearActiveResize = () => {
		setActiveResize(null);
	};

	const handleStartEditing = (id: string) => {
		clearActiveDrag();
		clearActiveResize();
		setEditingEventId(id);
	};

	const handleCancelEditing = (id: string) => {
		setEditingEventId((editingId) => (editingId === id ? null : editingId));
	};

	const handleCommitLabel = (id: string, label: string) => {
		setEvents((prev) =>
			prev.map((event) => (event.id === id ? { ...event, label } : event)),
		);
		setEditingEventId((editingId) => (editingId === id ? null : editingId));
	};

	const handleResizeStart = (
		id: string,
		edge: ResizeEdge,
		clientX: number,
		trackWidth: number,
	) => {
		const eventToResize = events.find((timelineEvent) => timelineEvent.id === id);

		if (!eventToResize || trackWidth <= 0) {
			return;
		}

		clearActiveDrag();
		setEditingEventId(null);
		setActiveResize({
			id,
			edge,
			startClientX: clientX,
			startLeftPercent: eventToResize.leftPercent,
			startWidthPercent: eventToResize.widthPercent,
			trackWidth,
		});
	};

	useEffect(() => {
		document.documentElement.dataset.theme = themeMode;
		document.documentElement.style.colorScheme = themeMode;
		setStoredThemeMode(themeMode);
	}, [themeMode]);

	useEffect(() => {
		setStoredYearsToDisplay(yearsToDisplay);
	}, [yearsToDisplay]);

	useEffect(() => {
		setStoredEvents(events);
	}, [events]);

	useEffect(() => {
		if (!activeResize) {
			return;
		}

		const handlePointerMove = (event: PointerEvent) => {
			const deltaPercent =
				((event.clientX - activeResize.startClientX) / activeResize.trackWidth) *
				100;

			setEvents((prev) =>
				prev.map((timelineEvent) =>
					timelineEvent.id === activeResize.id
						? resizeTimelineEvent(
								{
									...timelineEvent,
									leftPercent: activeResize.startLeftPercent,
									widthPercent: activeResize.startWidthPercent,
								},
								activeResize.edge,
								deltaPercent,
							)
						: timelineEvent,
					),
				);
		};

		const stopResize = () => {
			clearActiveResize();
		};

		const previousUserSelect = document.body.style.userSelect;
		const previousCursor = document.body.style.cursor;

		document.body.style.userSelect = "none";
		document.body.style.cursor = "ew-resize";
		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", stopResize);
		window.addEventListener("pointercancel", stopResize);

		return () => {
			document.body.style.userSelect = previousUserSelect;
			document.body.style.cursor = previousCursor;
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", stopResize);
			window.removeEventListener("pointercancel", stopResize);
		};
	}, [activeResize]);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && over.id) {
			const dropTarget = getDropTarget(String(over.id));

			if (dropTarget) {
				setEvents((prev) => {
					const draggedEvent =
						prev.find((timelineEvent) => timelineEvent.id === String(active.id)) ??
						null;

					if (!draggedEvent) {
						return prev;
					}

					const nextPosition = moveTimelineEventToWeek(
						draggedEvent,
						dropTarget.year,
						dropTarget.weekNumber,
						draggedEvent.lane,
					);
					const nextLane = findAvailableLane(
						prev,
						dropTarget.year,
						nextPosition.leftPercent,
						draggedEvent.widthPercent,
						draggedEvent.id,
					);

					if (nextLane === null) {
						return prev;
					}

					return prev.map((timelineEvent) =>
						timelineEvent.id === draggedEvent.id
							? moveTimelineEventToWeek(
									timelineEvent,
									dropTarget.year,
									dropTarget.weekNumber,
									nextLane,
								)
							: timelineEvent,
						);
				});
			}
		}

		clearActiveDrag();
	};

	const handleLogEvent = () => {
		setEvents((prev) => {
			const candidateYears = [...years].reverse();
			const placement = findNextEventPlacement(
				prev,
				candidateYears,
				LOG_EVENT_WIDTH_PERCENT,
			);

			if (!placement) {
				return prev;
			}

			return [
				...prev,
				{
					id: `e${prev.length + 1}`,
					year: placement.year,
					leftPercent: placement.leftPercent,
					widthPercent: LOG_EVENT_WIDTH_PERCENT,
					colorIndex: prev.length,
					label: "",
					lane: placement.lane,
				},
			];
		});
	};

	return (
		<div className="timeline">
			<Settings
				yearsToDisplay={yearsToDisplay}
				setYearsToDisplay={setYearsToDisplay}
				isDarkMode={themeMode === "dark"}
				setIsDarkMode={(isDarkMode) =>
					setThemeMode(isDarkMode ? "dark" : "light")
				}
			/>
			<h1 className="timeline__title">THIS IS YOUR LIFE.</h1>

			<div className="timeline__subtitle">
				<span>
					A retrospective look at what you have been doing all this time.
				</span>
			</div>

			<DndContext
				collisionDetection={pointerWithin}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
				onDragCancel={clearActiveDrag}
				sensors={sensors}
			>
				<div className="timeline__rows">
					{years.map((year) => (
						<TimelineRow
							key={year}
							year={year}
							events={events.filter((e) => e.year === year)}
							activeResizeId={activeResize?.id ?? null}
							editingEventId={editingEventId}
							onCancelEditing={handleCancelEditing}
							onCommitLabel={handleCommitLabel}
							onResizeStart={handleResizeStart}
							onStartEditing={handleStartEditing}
						/>
					))}
				</div>
				<DragOverlay
					dropAnimation={null}
					modifiers={[snapDragToRow]}
					zIndex={2000}
				>
					{activeEvent && activeDrag ? (
						<EventBlockOverlay
							width={activeDrag.width}
							height={activeDrag.height}
							colorIndex={activeEvent.colorIndex}
							label={activeEvent.label}
						/>
					) : null}
				</DragOverlay>
			</DndContext>

			<div className="timeline-controls">
				<button
					className="timeline-controls__primary"
					onClick={handleLogEvent}
					type="button"
				>
					Log Event
				</button>
				<div className="timeline-controls__pagination">
					<button className="timeline-controls__page-button" type="button">
						←
					</button>
					<button className="timeline-controls__page-button" type="button">
						Next →
					</button>
				</div>
			</div>
		</div>
	);
}

export default App;
