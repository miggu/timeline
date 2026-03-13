import React, { useEffect, useState } from "react";
import {
	DndContext,
	DragOverlay,
	pointerWithin,
	type DragEndEvent,
	type DragStartEvent,
	type Modifier,
} from "@dnd-kit/core";
import { TimelineRow } from "./components/TimelineRow";
import { EventBlockOverlay } from "./components/EventBlock";
import { SettingsPanel } from "./components/SettingsPanel";
import {
	EVENT_BLOCK_TOP,
	LOG_EVENT_WIDTH_PERCENT,
	findNextEventPlacement,
	moveTimelineEventToWeek,
	resizeTimelineEvent,
	type ResizeEdge,
	type TimelineEvent,
} from "./timeline";

type ThemeMode = "light" | "dark";

interface ActiveDragState {
	id: string;
	width: number;
	height: number;
}

interface ActiveResizeState {
	id: string;
	edge: ResizeEdge;
	startClientX: number;
	startLeftPercent: number;
	startWidthPercent: number;
	trackWidth: number;
}

const snapDragToRow: Modifier = ({ transform, activeNodeRect, over }) => {
	if (!activeNodeRect) {
		return transform;
	}

	if (!over) {
		return {
			...transform,
			y: 0,
		};
	}

	return {
		...transform,
		y: over.rect.top + EVENT_BLOCK_TOP - activeNodeRect.top,
	};
};

const THEME_STORAGE_KEY = "timeline-theme";

const getInitialThemeMode = (): ThemeMode => {
	if (typeof window === "undefined") {
		return "light";
	}

	const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

	if (storedTheme === "light" || storedTheme === "dark") {
		return storedTheme;
	}

	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
};

const App: React.FC = () => {
	const currentYear = 2026;
	const [yearsToDisplay, setYearsToDisplay] = useState<number>(3); // Default to 3 years
	const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);

	// Calculate the array of years to map over
	const years = Array.from(
		{ length: yearsToDisplay },
		(_, i) => currentYear - (yearsToDisplay - 1) + i,
	);

	const [events, setEvents] = useState<TimelineEvent[]>([
		{ id: "e1", year: 2024, leftPercent: 10, widthPercent: 15, colorIndex: 0 },
		{ id: "e2", year: 2025, leftPercent: 75, widthPercent: 12, colorIndex: 1 },
		{ id: "e3", year: 2019, leftPercent: 30, widthPercent: 8, colorIndex: 2 },
	]);
	const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
	const [activeResize, setActiveResize] = useState<ActiveResizeState | null>(
		null,
	);

	const activeEvent = activeDrag
		? events.find((event) => event.id === activeDrag.id) ?? null
		: null;

	const handleDragStart = (event: DragStartEvent) => {
		const activeId = String(event.active.id);
		const timelineEvent = events.find((item) => item.id === activeId) ?? null;
		const dragTarget = event.activatorEvent.target;
		const blockElement =
			dragTarget instanceof Element
				? (dragTarget.closest(".event-block") as HTMLElement | null)
				: null;
		const trackElement = blockElement?.closest(".track") as HTMLElement | null;
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
		});
	};

	const clearActiveDrag = () => {
		setActiveDrag(null);
	};

	const clearActiveResize = () => {
		setActiveResize(null);
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
		window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
	}, [themeMode]);

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

		// If dropped over a valid week cell
		if (over && over.id) {
			const dropId = String(over.id); // e.g. "week-2024-5"
			const match = dropId.match(/week-(\d+)-(\d+)/);

			if (match) {
				const dropYear = Number.parseInt(match[1], 10);
				const dropWeek = Number.parseInt(match[2], 10);

				setEvents((prev) =>
					prev.map((ev) =>
						ev.id === String(active.id)
							? moveTimelineEventToWeek(ev, dropYear, dropWeek)
							: ev,
						),
					);
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
				},
			];
		});
	};

	return (
		<div className="timeline-card">
			<SettingsPanel
				yearsToDisplay={yearsToDisplay}
				setYearsToDisplay={setYearsToDisplay}
				isDarkMode={themeMode === "dark"}
				setIsDarkMode={(isDarkMode) =>
					setThemeMode(isDarkMode ? "dark" : "light")
				}
			/>
			<h1>THIS IS YOUR LIFE.</h1>

			<div className="subtitle">
				<span>
					A retrospective look at what you have been doing all this time.
				</span>
			</div>

			<DndContext
				collisionDetection={pointerWithin}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
				onDragCancel={clearActiveDrag}
			>
				<div className="timeline-container">
					{years.map((year) => (
						<TimelineRow
							key={year}
							year={year}
							events={events.filter((e) => e.year === year)}
							activeResizeId={activeResize?.id ?? null}
							onResizeStart={handleResizeStart}
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
						/>
					) : null}
				</DragOverlay>
			</DndContext>

			<div className="controls-container">
				<button className="btn-primary" onClick={handleLogEvent} type="button">
					Log Event
				</button>
				<div className="pagination">
					<button className="btn-icon">←</button>
					<button className="btn-icon">Next →</button>
				</div>
			</div>
		</div>
	);
};

export default App;
