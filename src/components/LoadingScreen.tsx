import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { StartupProgress, StartupProgressStep } from "../lib/startup/startupProgress";

export interface LoadingScreenDiagnosticEvent {
  key: string;
  label: string;
  detail: string;
  progress?: number;
  status?: StartupProgressStep["status"];
}

interface LoadingScreenProps {
  progress: StartupProgress;
  diagnostics?: LoadingScreenDiagnosticEvent[];
  isPaused?: boolean;
  onConsoleDrainChange?: (isDraining: boolean) => void;
}

interface ProgressStyle extends CSSProperties {
  "--loading-progress": string;
}

interface TerminalLogEntry {
  id: string;
  index: number;
  key: string;
  line: string;
  progress: number;
  status: StartupProgressStep["status"];
}

export interface StartupConsoleEvent {
  key: string;
  label: string;
  detail: string;
  line: string;
  progress: number;
  signature: string;
  status: StartupProgressStep["status"];
}

type LoadingScreenResizeEdge = "n" | "e" | "s" | "w" | "ne" | "nw" | "se" | "sw";
type LoadingScreenShellMode = "expanded" | "minimized";

interface LoadingScreenShellRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface LoadingScreenShellResizeDrag {
  edge: LoadingScreenResizeEdge;
  mode: LoadingScreenShellMode;
  pointerId: number;
  startX: number;
  startY: number;
  startRect: LoadingScreenShellRect;
}

interface LoadingScreenShellMoveDrag {
  mode: LoadingScreenShellMode;
  pointerId: number;
  startX: number;
  startY: number;
  startRect: LoadingScreenShellRect;
}

interface LoadingScreenShellStyle extends CSSProperties {
  "--loading-screen-shell-left"?: string;
  "--loading-screen-shell-top"?: string;
  "--loading-screen-shell-width"?: string;
  "--loading-screen-shell-height"?: string;
}

const TERMINAL_LOG_ENTRY_LIMIT = 80;
const MATRIX_OVERLAY_LINE_COUNT = 42;
const DEFAULT_LOADING_SPEED = 50;
const LOADING_SPEED_INPUT_BOOST = 2;
const MIN_TERMINAL_LOG_PRINT_DELAY_MS = 5;
const DEFAULT_TERMINAL_LOG_PRINT_DELAY_MS = 100;
const MAX_TERMINAL_LOG_PRINT_DELAY_MS = 175;
const LOADING_SCREEN_EXPANDED_MIN_WIDTH = 360;
const LOADING_SCREEN_EXPANDED_MIN_HEIGHT = 260;
const LOADING_SCREEN_MINIMIZED_DEFAULT_WIDTH = 420;
const LOADING_SCREEN_MINIMIZED_DEFAULT_HEIGHT = 220;
const LOADING_SCREEN_MINIMIZED_MIN_WIDTH = 300;
const LOADING_SCREEN_MINIMIZED_MIN_HEIGHT = 170;
const LOADING_SCREEN_SHELL_MARGIN = 12;
const LOADING_SCREEN_RESIZE_EDGES: LoadingScreenResizeEdge[] = ["n", "e", "s", "w", "ne", "nw", "se", "sw"];
const LOADING_SCREEN_WINDOW_VERSION = "2464";

function getStatusLabel(status: StartupProgressStep["status"]) {
  switch (status) {
    case "pending":
      return "PENDING";
    case "active":
      return "ACTIVE";
    case "complete":
      return "READY";
    case "degraded":
      return "DEGRADED";
    case "error":
      return "ERROR";
  }
}

function getTerminalPhaseLabel(id: StartupProgressStep["id"]) {
  return id.toUpperCase();
}

function getLogIndex(index: number) {
  return index.toString().padStart(2, "0");
}

function getConsoleLine(step: StartupProgressStep, index: number) {
  return `${getLogIndex(index)} > ${getTerminalPhaseLabel(step.id)} :: ${getStatusLabel(step.status)} :: ${step.detail} :: ${step.progress}%`;
}

function getDiagnosticConsoleLine(diagnostic: LoadingScreenDiagnosticEvent, index: number) {
  return `${getLogIndex(index)} > ${diagnostic.label} :: ${getStatusLabel(diagnostic.status ?? "complete")} :: ${diagnostic.detail} :: ${diagnostic.progress ?? 100}%`;
}

export function getStartupConsoleEvents(progress: StartupProgress, diagnostics: LoadingScreenDiagnosticEvent[] = []): StartupConsoleEvent[] {
  const stepEvents = progress.steps.map((step, index) => ({
    key: step.id,
    label: getTerminalPhaseLabel(step.id),
    detail: step.detail,
    line: getConsoleLine(step, index),
    progress: step.progress,
    signature: `${step.status}|${step.progress}|${step.detail}`,
    status: step.status,
  }));
  const bootGateStatus: StartupProgressStep["status"] = progress.isBlocking ? "active" : "complete";
  const bootGateDetail = progress.blockingReason ?? "required systems online";

  return [
    ...stepEvents,
    {
      key: "boot_gate",
      label: "BOOT_GATE",
      detail: bootGateDetail,
      line: `${getLogIndex(progress.steps.length)} > BOOT_GATE :: ${progress.isBlocking ? "WAIT" : "PASS"} :: ${bootGateDetail}`,
      progress: progress.requiredProgress,
      signature: `${bootGateStatus}|${progress.requiredProgress}|${bootGateDetail}`,
      status: bootGateStatus,
    },
    ...diagnostics.map((diagnostic, index) => {
      const status = diagnostic.status ?? "complete";
      const diagnosticProgress = diagnostic.progress ?? 100;

      return {
        key: `diagnostic:${diagnostic.key}`,
        label: diagnostic.label,
        detail: diagnostic.detail,
        line: getDiagnosticConsoleLine(diagnostic, progress.steps.length + 1 + index),
        progress: diagnosticProgress,
        signature: `${status}|${diagnosticProgress}|${diagnostic.detail}`,
        status,
      };
    }),
  ];
}

function getTerminalLogPrintDelay(speed: number) {
  if (speed === DEFAULT_LOADING_SPEED) {
    return DEFAULT_TERMINAL_LOG_PRINT_DELAY_MS;
  }

  if (speed > DEFAULT_LOADING_SPEED) {
    const fastRatio = (speed - DEFAULT_LOADING_SPEED) / DEFAULT_LOADING_SPEED;
    return Math.round(DEFAULT_TERMINAL_LOG_PRINT_DELAY_MS - fastRatio * (DEFAULT_TERMINAL_LOG_PRINT_DELAY_MS - MIN_TERMINAL_LOG_PRINT_DELAY_MS));
  }

  const slowRatio = (DEFAULT_LOADING_SPEED - speed) / DEFAULT_LOADING_SPEED;
  return Math.round(DEFAULT_TERMINAL_LOG_PRINT_DELAY_MS + slowRatio * (MAX_TERMINAL_LOG_PRINT_DELAY_MS - DEFAULT_TERMINAL_LOG_PRINT_DELAY_MS));
}

function isSpeedControlInput(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(".loading-screen-speed-control"));
}

function isResizeHandle(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(".loading-screen-resize-handle"));
}

function getShellMinimumSize(mode: LoadingScreenShellMode) {
  return mode === "minimized"
    ? {
        minHeight: LOADING_SCREEN_MINIMIZED_MIN_HEIGHT,
        minWidth: LOADING_SCREEN_MINIMIZED_MIN_WIDTH,
      }
    : {
        minHeight: LOADING_SCREEN_EXPANDED_MIN_HEIGHT,
        minWidth: LOADING_SCREEN_EXPANDED_MIN_WIDTH,
      };
}

function getViewportResizeBounds(mode: LoadingScreenShellMode) {
  const viewportWidth = Math.max(1, window.innerWidth);
  const viewportHeight = Math.max(1, window.innerHeight);
  const maxWidth = Math.max(1, viewportWidth - LOADING_SCREEN_SHELL_MARGIN * 2);
  const maxHeight = Math.max(1, viewportHeight - LOADING_SCREEN_SHELL_MARGIN * 2);
  const minimumSize = getShellMinimumSize(mode);

  return {
    maxHeight,
    maxWidth,
    minHeight: Math.min(minimumSize.minHeight, maxHeight),
    minWidth: Math.min(minimumSize.minWidth, maxWidth),
    viewportHeight,
    viewportWidth,
  };
}

function clampLoadingScreenShellRect(rect: LoadingScreenShellRect, mode: LoadingScreenShellMode): LoadingScreenShellRect {
  const { maxHeight, maxWidth, minHeight, minWidth, viewportHeight, viewportWidth } = getViewportResizeBounds(mode);
  const width = Math.max(minWidth, Math.min(maxWidth, rect.width));
  const height = Math.max(minHeight, Math.min(maxHeight, rect.height));

  return {
    left: Math.max(LOADING_SCREEN_SHELL_MARGIN, Math.min(viewportWidth - LOADING_SCREEN_SHELL_MARGIN - width, rect.left)),
    top: Math.max(LOADING_SCREEN_SHELL_MARGIN, Math.min(viewportHeight - LOADING_SCREEN_SHELL_MARGIN - height, rect.top)),
    width,
    height,
  };
}

function getDefaultMinimizedShellRect() {
  const { maxHeight, maxWidth, viewportHeight } = getViewportResizeBounds("minimized");
  const width = Math.min(LOADING_SCREEN_MINIMIZED_DEFAULT_WIDTH, maxWidth);
  const height = Math.min(LOADING_SCREEN_MINIMIZED_DEFAULT_HEIGHT, maxHeight);

  return clampLoadingScreenShellRect({
    height,
    left: LOADING_SCREEN_SHELL_MARGIN,
    top: viewportHeight - LOADING_SCREEN_SHELL_MARGIN - height,
    width,
  }, "minimized");
}

function getResizedShellRect(drag: LoadingScreenShellResizeDrag, clientX: number, clientY: number) {
  const deltaX = clientX - drag.startX;
  const deltaY = clientY - drag.startY;
  let { left, top, width, height } = drag.startRect;

  if (drag.edge.includes("e")) {
    width = drag.startRect.width + deltaX;
  }

  if (drag.edge.includes("s")) {
    height = drag.startRect.height + deltaY;
  }

  if (drag.edge.includes("w")) {
    left = drag.startRect.left + deltaX;
    width = drag.startRect.width - deltaX;
  }

  if (drag.edge.includes("n")) {
    top = drag.startRect.top + deltaY;
    height = drag.startRect.height - deltaY;
  }

  const { maxHeight, maxWidth, minHeight, minWidth, viewportHeight, viewportWidth } = getViewportResizeBounds(drag.mode);
  const startRight = drag.startRect.left + drag.startRect.width;
  const startBottom = drag.startRect.top + drag.startRect.height;

  if (drag.edge.includes("w")) {
    const maxLeft = startRight - minWidth;
    left = Math.max(LOADING_SCREEN_SHELL_MARGIN, Math.min(maxLeft, left));
    width = startRight - left;
  } else {
    width = Math.max(minWidth, Math.min(maxWidth, width));
  }

  if (drag.edge.includes("n")) {
    const maxTop = startBottom - minHeight;
    top = Math.max(LOADING_SCREEN_SHELL_MARGIN, Math.min(maxTop, top));
    height = startBottom - top;
  } else {
    height = Math.max(minHeight, Math.min(maxHeight, height));
  }

  if (!drag.edge.includes("w") && left + width > viewportWidth - LOADING_SCREEN_SHELL_MARGIN) {
    width = viewportWidth - LOADING_SCREEN_SHELL_MARGIN - left;
  }

  if (!drag.edge.includes("n") && top + height > viewportHeight - LOADING_SCREEN_SHELL_MARGIN) {
    height = viewportHeight - LOADING_SCREEN_SHELL_MARGIN - top;
  }

  return clampLoadingScreenShellRect({ left, top, width, height }, drag.mode);
}

export function LoadingScreen({ progress, diagnostics = [], isPaused = false, onConsoleDrainChange }: LoadingScreenProps) {
  const [terminalLogEntries, setTerminalLogEntries] = useState<TerminalLogEntry[]>([]);
  const [pendingTerminalLogEntries, setPendingTerminalLogEntries] = useState<TerminalLogEntry[]>([]);
  const [isConsoleCaptureClosed, setIsConsoleCaptureClosed] = useState(false);
  const [loadingSpeed, setLoadingSpeed] = useState(DEFAULT_LOADING_SPEED);
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedShellRect, setExpandedShellRect] = useState<LoadingScreenShellRect | null>(null);
  const [minimizedShellRect, setMinimizedShellRect] = useState<LoadingScreenShellRect | null>(null);
  const [isResizingShell, setIsResizingShell] = useState(false);
  const [isMovingShell, setIsMovingShell] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const shellResizeDragRef = useRef<LoadingScreenShellResizeDrag | null>(null);
  const shellMoveDragRef = useRef<LoadingScreenShellMoveDrag | null>(null);
  const terminalLogIndexRef = useRef(0);
  const previousConsoleSignaturesRef = useRef<Map<string, string>>(new Map());
  const terminalLogPrintDelayMs = getTerminalLogPrintDelay(loadingSpeed);
  const trackedConsoleEvents = useMemo(() => getStartupConsoleEvents(progress, diagnostics), [diagnostics, progress]);
  const matrixOverlayLines = terminalLogEntries.slice(-MATRIX_OVERLAY_LINE_COUNT).map((entry, index) => `${entry.line} // TRACE_${getLogIndex(index)}`);
  const shellMode: LoadingScreenShellMode = isMinimized ? "minimized" : "expanded";
  const shellRect = isMinimized ? minimizedShellRect : expandedShellRect;
  const shellStyle = shellRect
    ? ({
        "--loading-screen-shell-left": `${shellRect.left}px`,
        "--loading-screen-shell-top": `${shellRect.top}px`,
        "--loading-screen-shell-width": `${shellRect.width}px`,
        "--loading-screen-shell-height": `${shellRect.height}px`,
      } as LoadingScreenShellStyle)
    : undefined;
  const setActiveShellRect = (value: LoadingScreenShellRect | ((current: LoadingScreenShellRect | null) => LoadingScreenShellRect | null)) => {
    if (shellMode === "minimized") {
      setMinimizedShellRect(value);
      return;
    }

    setExpandedShellRect(value);
  };

  useEffect(() => {
    if (isConsoleCaptureClosed) {
      return;
    }

    const nextSignatures = new Map(previousConsoleSignaturesRef.current);
    const nextEntries: TerminalLogEntry[] = [];

    for (const event of trackedConsoleEvents) {
      if (previousConsoleSignaturesRef.current.get(event.key) === event.signature) {
        continue;
      }

      const nextIndex = terminalLogIndexRef.current;
      terminalLogIndexRef.current += 1;
      nextSignatures.set(event.key, event.signature);
      nextEntries.push({
        id: `${event.key}-${nextIndex}`,
        index: nextIndex,
        key: event.key,
        line: event.line,
        progress: event.progress,
        status: event.status,
      });
    }

    previousConsoleSignaturesRef.current = nextSignatures;

    if (nextEntries.length > 0) {
      setPendingTerminalLogEntries((current) => [...current, ...nextEntries]);
    }

    if (!progress.isBlocking) {
      setIsConsoleCaptureClosed(true);
    }
  }, [isConsoleCaptureClosed, progress.isBlocking, trackedConsoleEvents]);

  useEffect(() => {
    onConsoleDrainChange?.(pendingTerminalLogEntries.length > 0);
  }, [onConsoleDrainChange, pendingTerminalLogEntries.length]);

  useEffect(() => {
    const boostLoadingSpeed = () => {
      setLoadingSpeed((current) => Math.min(100, current + LOADING_SPEED_INPUT_BOOST));
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.code === "Space" || event.key === " " || isSpeedControlInput(event.target)) {
        return;
      }

      boostLoadingSpeed();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (isSpeedControlInput(event.target) || isResizeHandle(event.target)) {
        return;
      }

      boostLoadingSpeed();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setExpandedShellRect((current) => current ? clampLoadingScreenShellRect(current, "expanded") : current);
      setMinimizedShellRect((current) => current ? clampLoadingScreenShellRect(current, "minimized") : current);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const nextEntry = pendingTerminalLogEntries[0];

    if (!nextEntry) {
      return;
    }

    const printTimeout = window.setTimeout(() => {
      setTerminalLogEntries((current) => [...current, nextEntry].slice(-TERMINAL_LOG_ENTRY_LIMIT));
      setPendingTerminalLogEntries((current) => current[0]?.id === nextEntry.id ? current.slice(1) : current.filter((entry) => entry.id !== nextEntry.id));
    }, terminalLogPrintDelayMs);

    return () => window.clearTimeout(printTimeout);
  }, [pendingTerminalLogEntries, terminalLogPrintDelayMs]);

  const handleMinimize = () => {
    setMinimizedShellRect((current) => current ?? getDefaultMinimizedShellRect());
    setIsMinimized(true);
  };

  const handleExpand = () => {
    setIsMinimized(false);
  };

  const handleShellResizePointerDown = (edge: LoadingScreenResizeEdge, event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const shellBounds = shellRef.current?.getBoundingClientRect();

    if (!shellBounds) {
      return;
    }

    const startRect = clampLoadingScreenShellRect({
      height: shellBounds.height,
      left: shellBounds.left,
      top: shellBounds.top,
      width: shellBounds.width,
    }, shellMode);

    event.currentTarget.setPointerCapture(event.pointerId);
    shellResizeDragRef.current = {
      edge,
      mode: shellMode,
      pointerId: event.pointerId,
      startRect,
      startX: event.clientX,
      startY: event.clientY,
    };
    setActiveShellRect(startRect);
    setIsResizingShell(true);
  };

  const handleShellResizePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const resizeDrag = shellResizeDragRef.current;

    if (!resizeDrag || resizeDrag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    if (resizeDrag.mode === "minimized") {
      setMinimizedShellRect(getResizedShellRect(resizeDrag, event.clientX, event.clientY));
      return;
    }

    setExpandedShellRect(getResizedShellRect(resizeDrag, event.clientX, event.clientY));
  };

  const finishShellResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const resizeDrag = shellResizeDragRef.current;

    if (!resizeDrag || resizeDrag.pointerId !== event.pointerId) {
      return;
    }

    shellResizeDragRef.current = null;
    setIsResizingShell(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleShellMovePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isSpeedControlInput(event.target) || event.target instanceof Element && Boolean(event.target.closest("button"))) {
      return;
    }

    event.preventDefault();

    const shellBounds = shellRef.current?.getBoundingClientRect();

    if (!shellBounds) {
      return;
    }

    const startRect = clampLoadingScreenShellRect({
      height: shellBounds.height,
      left: shellBounds.left,
      top: shellBounds.top,
      width: shellBounds.width,
    }, shellMode);

    shellMoveDragRef.current = {
      mode: shellMode,
      pointerId: event.pointerId,
      startRect,
      startX: event.clientX,
      startY: event.clientY,
    };
    setActiveShellRect(startRect);
    setIsMovingShell(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const moveDrag = shellMoveDragRef.current;

      if (!moveDrag || moveDrag.pointerId !== moveEvent.pointerId) {
        return;
      }

      moveEvent.preventDefault();
      const nextRect = clampLoadingScreenShellRect({
        ...moveDrag.startRect,
        left: moveDrag.startRect.left + moveEvent.clientX - moveDrag.startX,
        top: moveDrag.startRect.top + moveEvent.clientY - moveDrag.startY,
      }, moveDrag.mode);

      if (moveDrag.mode === "minimized") {
        setMinimizedShellRect(nextRect);
        return;
      }

      setExpandedShellRect(nextRect);
    };

    const finishMove = (finishEvent: PointerEvent) => {
      const moveDrag = shellMoveDragRef.current;

      if (!moveDrag || moveDrag.pointerId !== finishEvent.pointerId) {
        return;
      }

      shellMoveDragRef.current = null;
      setIsMovingShell(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishMove);
      window.removeEventListener("pointercancel", finishMove);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", finishMove);
    window.addEventListener("pointercancel", finishMove);
  };

  return (
    <section className="loading-screen" data-minimized={isMinimized ? "true" : undefined} aria-label="Sync Sesh startup progress" aria-live="polite">
      <div className="loading-screen-matrix-overlay" aria-hidden="true">
        {matrixOverlayLines.map((line, index) => (
          <span className="loading-screen-matrix-overlay-line" key={`${line}-${index}`}>
            {line}
          </span>
        ))}
      </div>

      <div
        className={isMinimized ? "loading-screen-minimized-widget" : "loading-screen-shell"}
        data-positioned={shellRect ? "true" : undefined}
        data-moving={isMovingShell ? "true" : undefined}
        data-resizing={isResizingShell ? "true" : undefined}
        ref={shellRef}
        style={shellStyle}
      >
        {LOADING_SCREEN_RESIZE_EDGES.map((edge) => (
          <button
            aria-label={`Resize room link protocol ${edge}`}
            className="loading-screen-resize-handle"
            data-edge={edge}
            key={edge}
            onPointerCancel={finishShellResize}
            onPointerDown={(event) => handleShellResizePointerDown(edge, event)}
            onPointerMove={handleShellResizePointerMove}
            onPointerUp={finishShellResize}
            type="button"
          />
        ))}
        {isMinimized ? (
          <div className="loading-screen-minimized-content">
            <div className="loading-screen-minimized-header" onPointerDown={handleShellMovePointerDown}>
              <div>
                <p className="loading-screen-eyebrow">SYNC_SESH_BOOT</p>
                <h1>Room link protocol</h1>
              </div>
              <button className="loading-screen-window-button" type="button" onClick={handleExpand} aria-label="Expand room link protocol">
                ^
              </button>
            </div>

            <div className="loading-screen-minimized-overall" aria-label={`Required startup progress ${progress.requiredProgress}%`}>
              <div className="loading-screen-minimized-overall-copy">
                <span>required_progress</span>
                <strong>{progress.requiredProgress}%</strong>
                <em>{isPaused ? "PAUSED" : progress.isBlocking ? "LINKING" : "ONLINE"}</em>
              </div>
              <div className="loading-screen-bar" aria-hidden="true">
                <span style={{ "--loading-progress": `${progress.requiredProgress}%` } as ProgressStyle} />
              </div>
            </div>

            <div className="loading-screen-minimized-bars" aria-label="Startup loading bars">
              {progress.steps.map((step) => (
                <article className="loading-screen-minimized-line" data-status={step.status} data-required={step.required ? "true" : undefined} key={step.id}>
                  <span className="loading-screen-minimized-status">[{getStatusLabel(step.status)}]</span>
                  <strong>{getTerminalPhaseLabel(step.id)}</strong>
                  <span>{step.progress}%</span>
                  <div className="loading-screen-step-bar" aria-label={`${step.label} ${step.progress}%`}>
                    <span style={{ "--loading-progress": `${step.progress}%` } as ProgressStyle} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
        <div className="loading-screen-shell-content">
          <div
            className="loading-screen-terminal-header"
            onPointerDown={handleShellMovePointerDown}
          >
            <div>
              <p className="loading-screen-eyebrow">SYNC_SESH_BOOT</p>
              <h1>Room link protocol</h1>
            </div>
            <div className="loading-screen-terminal-progress">
              <span>required_progress</span>
              <div className="loading-screen-terminal-progress-row">
                <span className="loading-screen-window-version">v{LOADING_SCREEN_WINDOW_VERSION}</span>
                <strong>{progress.requiredProgress}%</strong>
                <button className="loading-screen-window-button" type="button" onClick={handleMinimize} aria-label="Minimize room link protocol">
                  _
                </button>
              </div>
            </div>
            <div className="loading-screen-speed-control">
              <input
                aria-label="Loading terminal print speed"
                max="100"
                min="0"
                onChange={(event) => setLoadingSpeed(Number(event.currentTarget.value))}
                type="range"
                value={loadingSpeed}
              />
            </div>
          </div>

          <div className="loading-screen-overall" aria-label={`Required startup progress ${progress.requiredProgress}%`}>
            <div className="loading-screen-overall-copy">
              <span>boot_sequence</span>
              <strong>{isPaused ? "PAUSED" : progress.isBlocking ? "LINKING" : "ONLINE"}</strong>
            </div>
            <div className="loading-screen-bar" aria-hidden="true">
              <span style={{ "--loading-progress": `${progress.requiredProgress}%` } as ProgressStyle} />
            </div>
          </div>

          <div className="loading-screen-terminal-log" aria-label="Startup console log">
            {progress.steps.map((step) => (
              <article className="loading-screen-terminal-line" data-status={step.status} data-required={step.required ? "true" : undefined} key={step.id}>
                <span className="loading-screen-terminal-status">[{getStatusLabel(step.status)}]</span>
                <strong className="loading-screen-terminal-label">{getTerminalPhaseLabel(step.id)}</strong>
                <span className="loading-screen-terminal-detail">{step.detail}</span>
                <div className="loading-screen-step-bar" aria-label={`${step.label} ${step.progress}%`}>
                  <span style={{ "--loading-progress": `${step.progress}%` } as ProgressStyle} />
                </div>
              </article>
            ))}
          </div>

          <div className="loading-screen-terminal-meta">
            <span>pause_key=p</span>
            <span>debug_pause={isPaused ? "true" : "false"}</span>
            <span>blocking={progress.isBlocking ? "true" : "false"}</span>
            <span>{progress.blockingReason ?? "all_required_systems_online"}</span>
          </div>

          <div className="loading-screen-terminal-feed" aria-label="Detailed startup console output">
            <div className="loading-screen-terminal-feed-header">
              <span>console_output</span>
              <strong>{terminalLogEntries.length}_events_logged</strong>
            </div>
            <div className="loading-screen-terminal-feed-lines">
              {terminalLogEntries.map((entry) => (
                <article className="loading-screen-terminal-feed-line" data-status={entry.status} key={entry.id}>
                  <span className="loading-screen-terminal-feed-index">{getLogIndex(entry.index)}</span>
                  <span className="loading-screen-terminal-feed-copy">
                    <span className="loading-screen-terminal-feed-prompt">&gt;</span> {entry.line.slice(5)}
                  </span>
                  <span className="loading-screen-terminal-feed-bar" aria-hidden="true">
                    <span style={{ "--loading-progress": `${entry.progress}%` } as ProgressStyle} />
                  </span>
                </article>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>
    </section>
  );
}
