import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
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
  getDayOfYear,
  getDayForWeek,
  getDaysInYear,
  getEventDurationDays,
  getEventWidthPercent,
  getTrackTimelineWidth,
  moveTimelineEventToWeek,
  resizeTimelineEvent,
  toTimelineEventRecord,
} from "./timeline";

interface ActiveDragState {
  id: string;
  width: number;
  height: number;
  anchorOffsetDays: number;
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
const INITIAL_YEARS_TO_DISPLAY = 9;

const getNextEventId = (events: TimelineEvent[]) => {
  const highestNumericId = events.reduce((highestId, event) => {
    const match = event.id.match(/^e(\d+)$/);

    if (!match) {
      return highestId;
    }

    return Math.max(highestId, Number.parseInt(match[1], 10));
  }, 0);

  return `e${highestNumericId + 1}`;
};

const getCreatedEvent = (
  events: TimelineEvent[],
  year: number,
  weekNumber: number,
) => {
  const beginDay = getDayForWeek(year, weekNumber);
  const dayCount = getDaysInYear(year);
  const safeBeginDay = Math.min(
    beginDay,
    dayCount - LOG_EVENT_DURATION_DAYS + 1,
  );
  const endDay = Math.min(
    safeBeginDay + LOG_EVENT_DURATION_DAYS - 1,
    dayCount,
  );
  const lane = findAvailableLane(events, year, safeBeginDay, endDay);

  if (lane === null) {
    return null;
  }

  return {
    id: getNextEventId(events),
    year,
    beginDay: safeBeginDay,
    endDay,
    colorIndex: events.length,
    label: "",
    lane,
  };
};

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

const getOldestEventYear = (events: TimelineEvent[]) => {
  if (events.length === 0) {
    return null;
  }

  return events.reduce(
    (oldestYear, event) => Math.min(oldestYear, event.year),
    events[0].year,
  );
};

const getInitialOldestYear = (
  events: TimelineEvent[],
  defaultOldestYear: number,
) => {
  const oldestEventYear = getOldestEventYear(events);

  return oldestEventYear === null
    ? defaultOldestYear
    : Math.min(defaultOldestYear, oldestEventYear);
};

const getPointerClientX = (activatorEvent: Event | undefined) => {
  if (!activatorEvent) {
    return null;
  }

  const pointerEvent = activatorEvent as Event & {
    changedTouches?: ArrayLike<{ clientX: number }>;
    clientX?: number;
    touches?: ArrayLike<{ clientX: number }>;
  };

  if (typeof pointerEvent.clientX === "number") {
    return pointerEvent.clientX;
  }

  if (pointerEvent.touches && pointerEvent.touches.length > 0) {
    return pointerEvent.touches[0]?.clientX ?? null;
  }

  if (pointerEvent.changedTouches && pointerEvent.changedTouches.length > 0) {
    return pointerEvent.changedTouches[0]?.clientX ?? null;
  }

  return null;
};

const getAnchorOffsetDays = (
  timelineEvent: TimelineEvent,
  blockElement: HTMLElement | null,
  pointerClientX: number | null,
) => {
  if (!blockElement || pointerClientX === null) {
    return 0;
  }

  const { left, width } = blockElement.getBoundingClientRect();

  if (width <= 0) {
    return 0;
  }

  const durationDays = getEventDurationDays(timelineEvent);
  const pointerRatio = Math.min(
    Math.max((pointerClientX - left) / width, 0),
    1,
  );

  return Math.round(pointerRatio * Math.max(durationDays - 1, 0));
};

function App() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentDayOfYear = getDayOfYear(today);
  const initialOldestYear = currentYear - INITIAL_YEARS_TO_DISPLAY + 1;
  const [events, setEvents] = useState<TimelineEvent[]>(getStoredEvents);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredThemeMode);
  const [oldestYear, setOldestYear] = useState(() =>
    getInitialOldestYear(events, initialOldestYear),
  );

  // Calculate the array of years to map over
  const years = Array.from(
    { length: currentYear - oldestYear + 1 },
    (_, i) => oldestYear + i,
  );

  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
  const [activeResize, setActiveResize] = useState<ActiveResizeState | null>(
    null,
  );
  const [dragPreview, setDragPreview] = useState<TimelineEvent | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [suppressedEditEventId, setSuppressedEditEventId] = useState<
    string | null
  >(null);
  const [timelineResetKey, setTimelineResetKey] = useState(0);
  const [recentlyDeletedEvent, setRecentlyDeletedEvent] =
    useState<RecentlyDeletedEventState | null>(null);
  const oldestRowRef = useRef<HTMLDivElement | null>(null);
  const pendingCreatedEventIdRef = useRef<string | null>(null);
  const pendingOlderYearLoadRef = useRef(false);
  const previousScrollHeightRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const hasScrolledRef = useRef(false);
  const scrollDirectionRef = useRef<"up" | "down">("down");
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const activeEvent = activeDrag
    ? (events.find((event) => event.id === activeDrag.id) ?? null)
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
      activeDrag?.id === draggedEvent.id ? activeDrag.anchorOffsetDays : 0,
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

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    const timelineEvent = events.find((item) => item.id === activeId) ?? null;
    const dragTarget = event.activatorEvent.target;
    const blockElement =
      dragTarget instanceof Element
        ? (dragTarget.closest(".timeline-event") as HTMLElement | null)
        : null;
    const trackElement = blockElement?.closest(
      ".timeline-row__track",
    ) as HTMLElement | null;
    const pointerClientX = getPointerClientX(event.activatorEvent);
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
        : (initialRect?.width ?? 48);
    const measuredHeight =
      blockElement?.getBoundingClientRect().height ?? initialRect?.height ?? 24;

    setActiveDrag({
      id: activeId,
      width: measuredWidth,
      height: measuredHeight,
      anchorOffsetDays:
        timelineEvent === null
          ? 0
          : getAnchorOffsetDays(timelineEvent, blockElement, pointerClientX),
    });
    setDragPreview(null);
    setSuppressedEditEventId(activeId);
    setEditingEventId(null);
  };

  const releaseSuppressedEdit = (id: string) => {
    window.setTimeout(() => {
      setSuppressedEditEventId((currentId) =>
        currentId === id ? null : currentId,
      );
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

  const clearActiveInteractions = () => {
    clearActiveDrag();
    clearActiveResize();
  };

  const handleStartEditing = (id: string) => {
    clearActiveInteractions();
    setEditingEventId(id);
  };

  const handleCancelEditing = (id: string) => {
    setEditingEventId((editingId) => (editingId === id ? null : editingId));
  };

  const handleCommitLabel = (id: string, label: string) => {
    const normalizedLabel = label.trimEnd();

    setEvents((prev) =>
      prev.map((event) =>
        event.id === id ? { ...event, label: normalizedLabel } : event,
      ),
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
    setEvents((prev) =>
      prev.filter((timelineEvent) => timelineEvent.id !== id),
    );
    setEditingEventId((currentId) => (currentId === id ? null : currentId));
    clearActiveInteractions();
  };

  const handleResizeStart = (
    id: string,
    edge: ResizeEdge,
    clientX: number,
    trackWidth: number,
  ) => {
    const eventToResize = events.find(
      (timelineEvent) => timelineEvent.id === id,
    );

    if (!eventToResize || trackWidth <= 0) {
      return;
    }

    clearActiveInteractions();
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
    const pendingCreatedEventId = pendingCreatedEventIdRef.current;

    if (!pendingCreatedEventId) {
      return;
    }

    const hasCreatedEvent = events.some(
      (timelineEvent) => timelineEvent.id === pendingCreatedEventId,
    );

    if (!hasCreatedEvent) {
      return;
    }

    clearActiveInteractions();
    setSuppressedEditEventId(null);
    setEditingEventId(pendingCreatedEventId);
    pendingCreatedEventIdRef.current = null;
  }, [events]);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const nextScrollY = window.scrollY;

      if (Math.abs(nextScrollY - lastScrollYRef.current) < 2) {
        return;
      }

      scrollDirectionRef.current =
        nextScrollY < lastScrollYRef.current ? "up" : "down";
      hasScrolledRef.current = hasScrolledRef.current || nextScrollY > 24;
      lastScrollYRef.current = nextScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const target = oldestRowRef.current;

    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        if (
          pendingOlderYearLoadRef.current ||
          !hasScrolledRef.current ||
          scrollDirectionRef.current !== "up"
        ) {
          return;
        }

        pendingOlderYearLoadRef.current = true;
        previousScrollHeightRef.current = document.documentElement.scrollHeight;
        setOldestYear((currentOldestYear) => currentOldestYear - 1);
      },
      {
        threshold: 0.1,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [oldestYear]);

  useLayoutEffect(() => {
    if (!pendingOlderYearLoadRef.current) {
      return;
    }

    const nextScrollHeight = document.documentElement.scrollHeight;
    const scrollDelta = nextScrollHeight - previousScrollHeightRef.current;

    if (scrollDelta > 0) {
      window.scrollBy(0, scrollDelta);
    }

    pendingOlderYearLoadRef.current = false;
  }, [oldestYear]);

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
        ((event.clientX - activeResize.startClientX) /
          activeResize.trackWidth) *
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

  const handleDragMove = (event: DragMoveEvent) => {
    updateDragPreview(
      String(event.active.id),
      event.over?.id ? String(event.over.id) : null,
    );
  };

  const handleCreateEvent = (year: number, weekNumber: number) => {
    setEvents((prev) => {
      const createdEvent = getCreatedEvent(prev, year, weekNumber);

      if (!createdEvent) {
        pendingCreatedEventIdRef.current = null;
        return prev;
      }

      pendingCreatedEventIdRef.current = createdEvent.id;

      return [...prev, createdEvent];
    });
  };

  const handleExportTimeline = () => {
    const exportPayload: TimelineExportData = {
      exportedAt: new Date().toISOString(),
      events: [...events]
        .sort(
          (left, right) =>
            left.year - right.year ||
            left.lane - right.lane ||
            left.beginDay - right.beginDay ||
            left.endDay - right.endDay ||
            left.id.localeCompare(right.id),
        )
        .map(toTimelineEventRecord),
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
    clearStoredTimelineData();
    clearActiveInteractions();
    pendingCreatedEventIdRef.current = null;
    setEditingEventId(null);
    setSuppressedEditEventId(null);
    setRecentlyDeletedEvent(null);
    setOldestYear(initialOldestYear);
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
      <h1 className="timeline__title">Where have you been?</h1>

      <DndContext
        key={timelineResetKey}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
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
              nowDay={year === currentYear ? currentDayOfYear : null}
              activeResizeId={activeResize?.id ?? null}
              editingEventId={editingEventId}
              suppressedEditEventId={suppressedEditEventId}
              rowRef={year === oldestYear ? oldestRowRef : undefined}
              onCreateEvent={handleCreateEvent}
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
