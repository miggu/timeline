import { useEffect, useState } from "react";
import {
	DndContext,
	DragOverlay,
	KeyboardSensor,
	PointerSensor,
	pointerWithin,
	type DragEndEvent,
	type DragMoveEvent,
	type DragOverEvent,
	type DragStartEvent,
	type Modifier,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { TimelineRow } from "./components/TimelineRow";
import { EventBlockOverlay } from "./components/EventBlock";
import { Settings } from "./components/Settings";
import {
	clearStoredTimelineData,
	getStoredEvents,
	getStoredThemeMode,
	setStoredEvents,
	setStoredThemeMode,
} from "./local-storage";
import type {
	ResizeEdge,
	ThemeMode,
	TimelineEvent,
	TimelineExportData,
} from "./types";
import {
	LOG_EVENT_DURATION_DAYS,
	findAvailableLane,
	findNextEventPlacement,
	getDaysInYear,
	getEventWidthPercent,
	getEventLaneTop,
	getTrackTimelineWidth,
	moveTimelineEventToWeek,
	resizeTimelineEvent,
} from "./timeline";

interface ActiveDragState {
	id: string;
	width: number;
	height: number;
}

interface ActiveResizeState {
	id: string;
	edge: ResizeEdge;
	startClientX: number;
	startBeginDay: number;
	startEndDay: number;
	trackWidth: number;
	year: number;
}

interface RecentlyDeletedEventState {
	event: TimelineEvent;
}

const DRAG_ACTIVATION_DISTANCE = 8;
const DRAG_CLICK_SUPPRESSION_MS = 120;
const YEARS_TO_DISPLAY = 9;

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
	const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredThemeMode);

	// Calculate the array of years to map over
	const years = Array.from(
		{ length: YEARS_TO_DISPLAY },
		(_, i) => currentYear - (YEARS_TO_DISPLAY - 1) + i,
	);

	const [events, setEvents] = useState<TimelineEvent[]>(getStoredEvents);
	const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
	const [activeResize, setActiveResize] = useState<ActiveResizeState | null>(
		null,
	);
	const [dragPreview, setDragPreview] = useState<TimelineEvent | null>(null);
	const [editingEventId, setEditingEventId] = useState<string | null>(null);
	const [suppressedEditEventId, setSuppressedEditEventId] = useState<string | null>(
		null,
	);
	const [timelineResetKey, setTimelineResetKey] = useState(0);
	const [recentlyDeletedEvent, setRecentlyDeletedEvent] =
		useState<RecentlyDeletedEventState | null>(null);
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: DRAG_ACTIVATION_DISTANCE,
			},
		}),
		useSensor(KeyboardSensor),
	);

	const activeEvent = activeDrag
		? events.find((event) => event.id === activeDrag.id) ?? null
		: null;
	const getDragPreview = (
		draggedEvent: TimelineEvent,
		dropTarget: ReturnType<typeof getDropTarget>,
	) => {
		if (!dropTarget) {
			return null;
		}

		const nextPosition = moveTimelineEventToWeek(
			draggedEvent,
			dropTarget.year,
			dropTarget.weekNumber,
			draggedEvent.lane,
		);
		const nextLane = findAvailableLane(
			events,
			dropTarget.year,
			nextPosition.beginDay,
			nextPosition.endDay,
			draggedEvent.id,
		);

		if (nextLane === null) {
			return null;
		}

		return {
			...draggedEvent,
			year: dropTarget.year,
			beginDay: nextPosition.beginDay,
			endDay: nextPosition.endDay,
			lane: nextLane,
		};
	};
	const snapDragToRow: Modifier = ({ transform, activeNodeRect, over }) => {
		if (!activeNodeRect || !activeEvent || !over) {
			return transform;
		}

		const preview = getDragPreview(activeEvent, getDropTarget(String(over.id)));

		if (!preview) {
			return transform;
		}

		return {
			...transform,
			y: over.rect.top + getEventLaneTop(preview.lane) - activeNodeRect.top,
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
				? (trackElement.getBoundingClientRect().width *
						getEventWidthPercent(
							timelineEvent.year,
							timelineEvent.beginDay,
							timelineEvent.endDay,
						)) /
					100
				: initialRect?.width ?? 48;
		const measuredHeight =
			blockElement?.getBoundingClientRect().height ?? initialRect?.height ?? 24;

		setActiveDrag({
			id: activeId,
			width: measuredWidth,
			height: measuredHeight,
		});
		setDragPreview(null);
		setSuppressedEditEventId(activeId);
		setEditingEventId(null);
	};

	const releaseSuppressedEdit = (id: string) => {
		window.setTimeout(() => {
			setSuppressedEditEventId((currentId) => (currentId === id ? null : currentId));
		}, DRAG_CLICK_SUPPRESSION_MS);
	};

	const clearActiveDrag = () => {
		setActiveDrag(null);
		setDragPreview(null);
	};

	const updateDragPreview = (activeId: string, overId?: string | null) => {
		const draggedEvent =
			events.find((timelineEvent) => timelineEvent.id === activeId) ?? null;

		if (!draggedEvent || !overId) {
			setDragPreview(null);
			return;
		}

		setDragPreview(getDragPreview(draggedEvent, getDropTarget(overId)));
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

	const handleDeleteEvent = (id: string) => {
		const eventToDelete =
			events.find((timelineEvent) => timelineEvent.id === id) ?? null;

		if (!eventToDelete) {
			return;
		}

		setRecentlyDeletedEvent({ event: eventToDelete });
		setEvents((prev) => prev.filter((timelineEvent) => timelineEvent.id !== id));
		setEditingEventId((currentId) => (currentId === id ? null : currentId));
		clearActiveDrag();
		clearActiveResize();
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
			startBeginDay: eventToResize.beginDay,
			startEndDay: eventToResize.endDay,
			trackWidth: getTrackTimelineWidth(trackWidth),
			year: eventToResize.year,
		});
	};

	useEffect(() => {
		document.documentElement.dataset.theme = themeMode;
		document.documentElement.style.colorScheme = themeMode;
		setStoredThemeMode(themeMode);
	}, [themeMode]);

	useEffect(() => {
		setStoredEvents(events);
	}, [events]);

	useEffect(() => {
		if (!recentlyDeletedEvent) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setRecentlyDeletedEvent(null);
		}, 5000);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [recentlyDeletedEvent]);

	useEffect(() => {
		if (!activeResize) {
			return;
		}

		const handlePointerMove = (event: PointerEvent) => {
			const deltaDays = Math.round(
				((event.clientX - activeResize.startClientX) / activeResize.trackWidth) *
					getDaysInYear(activeResize.year),
			);

			setEvents((prev) =>
				prev.map((timelineEvent) =>
					timelineEvent.id === activeResize.id
						? resizeTimelineEvent(
								{
									...timelineEvent,
									beginDay: activeResize.startBeginDay,
									endDay: activeResize.startEndDay,
								},
								activeResize.edge,
								deltaDays,
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
		const activeId = String(active.id);
		const draggedEvent =
			events.find((timelineEvent) => timelineEvent.id === activeId) ?? null;
		const preview = draggedEvent
			? getDragPreview(
					draggedEvent,
					over?.id ? getDropTarget(String(over.id)) : null,
				)
			: null;

		if (preview) {
			setEvents((prev) =>
				prev.map((timelineEvent) =>
					timelineEvent.id === activeId
						? {
								...timelineEvent,
								year: preview.year,
								beginDay: preview.beginDay,
								endDay: preview.endDay,
								lane: preview.lane,
							}
						: timelineEvent,
				),
			);
		}

		clearActiveDrag();
		releaseSuppressedEdit(activeId);
	};

	const handleDragOver = (event: DragOverEvent) => {
		updateDragPreview(
			String(event.active.id),
			event.over?.id ? String(event.over.id) : null,
		);
	};

	const handleDragMove = (event: DragMoveEvent) => {
		updateDragPreview(
			String(event.active.id),
			event.over?.id ? String(event.over.id) : null,
		);
	};

	const handleLogEvent = () => {
		setEvents((prev) => {
			const candidateYears = [...years].reverse();
			const placement = findNextEventPlacement(
				prev,
				candidateYears,
				LOG_EVENT_DURATION_DAYS,
			);

			if (!placement) {
				return prev;
			}

			return [
				...prev,
				{
					id: `e${prev.length + 1}`,
					year: placement.year,
					beginDay: placement.beginDay,
					endDay: placement.endDay,
					colorIndex: prev.length,
					label: "",
					lane: placement.lane,
				},
			];
		});
	};

	const handleExportTimeline = () => {
		const exportPayload: TimelineExportData = {
			version: 1,
			exportedAt: new Date().toISOString(),
			currentYear,
			yearsToDisplay: YEARS_TO_DISPLAY,
			themeMode,
			events: [...events].sort(
				(left, right) =>
					left.year - right.year ||
					left.lane - right.lane ||
					left.beginDay - right.beginDay ||
					left.endDay - right.endDay ||
					left.id.localeCompare(right.id),
			),
		};
		const exportBlob = new Blob([JSON.stringify(exportPayload, null, 2)], {
			type: "application/json",
		});
		const downloadUrl = window.URL.createObjectURL(exportBlob);
		const link = document.createElement("a");

		link.href = downloadUrl;
		link.download = `timeline-export-${new Date().toISOString().slice(0, 10)}.json`;
		document.body.append(link);
		link.click();
		link.remove();
		window.setTimeout(() => {
			window.URL.revokeObjectURL(downloadUrl);
		}, 0);
	};

	const handleDeleteAllData = () => {
		if (!window.confirm("Delete all timeline data from this browser?")) {
			return;
		}

		clearStoredTimelineData();
		clearActiveDrag();
		clearActiveResize();
		setEditingEventId(null);
		setSuppressedEditEventId(null);
		setRecentlyDeletedEvent(null);
		setEvents([]);
		setTimelineResetKey((currentKey) => currentKey + 1);
	};

	const handleUndoDelete = () => {
		if (!recentlyDeletedEvent) {
			return;
		}

		setEvents((prev) => [...prev, recentlyDeletedEvent.event]);
		setRecentlyDeletedEvent(null);
	};

	return (
		<div className="timeline">
			<Settings
				isDarkMode={themeMode === "dark"}
				setIsDarkMode={(isDarkMode) =>
					setThemeMode(isDarkMode ? "dark" : "light")
				}
				onExportTimeline={handleExportTimeline}
				onDeleteAllData={handleDeleteAllData}
			/>
			<h1 className="timeline__title">This is your life.</h1>

			<DndContext
				key={timelineResetKey}
				collisionDetection={pointerWithin}
				onDragStart={handleDragStart}
				onDragMove={handleDragMove}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}
				onDragCancel={() => {
					if (activeDrag) {
						releaseSuppressedEdit(activeDrag.id);
					}
					clearActiveDrag();
				}}
				sensors={sensors}
			>
				<div className="timeline__rows">
					{years.map((year) => (
						<TimelineRow
							key={year}
							year={year}
							events={events.filter((e) => e.year === year)}
							previewEvent={dragPreview?.year === year ? dragPreview : null}
							activeResizeId={activeResize?.id ?? null}
							editingEventId={editingEventId}
							suppressedEditEventId={suppressedEditEventId}
							onCancelEditing={handleCancelEditing}
							onCommitLabel={handleCommitLabel}
							onDeleteEvent={handleDeleteEvent}
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
			{recentlyDeletedEvent ? (
				<div className="timeline__toast" role="status" aria-live="polite">
					<span className="timeline__toast-message">Event deleted.</span>
					<button
						className="timeline__toast-action"
						type="button"
						onClick={handleUndoDelete}
					>
						Undo
					</button>
				</div>
			) : null}
		</div>
	);
}

export default App;
