import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent, type UIEvent } from "react";
import { createPortal } from "react-dom";
import { useDebugCommandHistory } from "../hooks/useDebugCommandHistory";
import { DEBUG_CONSOLE_SNAPSHOT_ROWS, formatDebugConsoleTimestamp, type DebugConsoleFilter, type DebugConsoleSnapshot } from "../hooks/useDebugConsoleState";
import type { DebugLogEntry } from "../lib/debug/debugConsole";

interface DebugConsoleFullscreenProps {
  isOpen: boolean;
  startCompact?: boolean;
  onClose: () => void;
  snapshot: DebugConsoleSnapshot;
  logs: DebugLogEntry[];
  commandHistory: string[];
  activeFilter: DebugConsoleFilter;
  onSubmitCommand: (command: string) => void;
}

const FULLSCREEN_SNAPSHOT_KEYS: Array<keyof DebugConsoleSnapshot> = [
  "buildId",
  "identitySource",
  "startupStage",
  "authStage",
  "syncConnection",
  "syncLatencyMs",
  "localProfileDisplayName",
  "instanceId",
];
const HIDE_CURTAIN_OFFSET_RATIO = 0.7;
const DEFAULT_COMPACT_HEIGHT = 168;
const MIN_COMPACT_HEIGHT = 116;

interface CurtainDragState {
  pointerId: number;
  startY: number;
  startOffset: number;
}

interface CompactResizeState {
  pointerId: number;
  startY: number;
  startHeight: number;
}

function formatSnapshotValue(value: boolean | number | string | undefined) {
  if (value === undefined || value === "") {
    return "n/a";
  }

  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }

  return String(value);
}

export function DebugConsoleFullscreen({
  isOpen,
  startCompact = false,
  onClose,
  snapshot,
  logs,
  commandHistory,
  activeFilter,
  onSubmitCommand,
}: DebugConsoleFullscreenProps) {
  const [commandValue, setCommandValue] = useState("");
  const [isAutoScrollPinned, setIsAutoScrollPinned] = useState(true);
  const [curtainOffset, setCurtainOffset] = useState(0);
  const [isDraggingCurtain, setIsDraggingCurtain] = useState(false);
  const [isDetailsVisible, setIsDetailsVisible] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  const [compactHeight, setCompactHeight] = useState(DEFAULT_COMPACT_HEIGHT);
  const [isCompactResizing, setIsCompactResizing] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const logListRef = useRef<HTMLDivElement | null>(null);
  const curtainDragRef = useRef<CurtainDragState | null>(null);
  const compactResizeRef = useRef<CompactResizeState | null>(null);
  const curtainOffsetRef = useRef(0);
  const compactHeightRef = useRef(DEFAULT_COMPACT_HEIGHT);
  const { handleCommandHistoryKeyDown, handleCommandValueChange } = useDebugCommandHistory({
    commandHistory,
    commandValue,
    setCommandValue,
  });
  const snapshotRows = useMemo(
    () => DEBUG_CONSOLE_SNAPSHOT_ROWS.filter((row) => FULLSCREEN_SNAPSHOT_KEYS.includes(row.key)),
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCommandValue("");
    setIsAutoScrollPinned(true);
    setCurtainOffset(0);
    curtainOffsetRef.current = 0;
    setIsDraggingCurtain(false);
    setIsDetailsVisible(true);
    setIsCompact(startCompact);
    setCompactHeight(DEFAULT_COMPACT_HEIGHT);
    setIsCompactResizing(false);
    compactHeightRef.current = DEFAULT_COMPACT_HEIGHT;
    shellRef.current?.style.setProperty("--debug-console-compact-height", `${DEFAULT_COMPACT_HEIGHT}px`);
    curtainDragRef.current = null;
    compactResizeRef.current = null;
    window.setTimeout(() => commandInputRef.current?.focus(), 0);
  }, [isOpen, startCompact]);

  useEffect(() => {
    const logList = logListRef.current;

    if (!logList || !isAutoScrollPinned) {
      return;
    }

    logList.scrollTop = logList.scrollHeight;
  }, [isAutoScrollPinned, logs]);

  const handleLogScroll = (event: UIEvent<HTMLDivElement>) => {
    const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) <= 32;
    setIsAutoScrollPinned(isNearBottom);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextCommand = commandValue.trim();

    if (!nextCommand) {
      return;
    }

    onSubmitCommand(nextCommand);

    if (nextCommand.toLowerCase().replace(/\s+/g, " ") === "compact") {
      setIsCompact((current) => !current);
    }

    setCommandValue("");
  };
  const updateCurtainOffset = (value: number) => {
    const nextOffset = Math.max(0, Math.min(window.innerHeight, value));
    curtainOffsetRef.current = nextOffset;
    setCurtainOffset(nextOffset);
  };
  const updateCompactHeight = (value: number) => {
    const maxCompactHeight = Math.max(MIN_COMPACT_HEIGHT, window.innerHeight);
    const nextHeight = Math.max(MIN_COMPACT_HEIGHT, Math.min(maxCompactHeight, value));
    compactHeightRef.current = nextHeight;
    shellRef.current?.style.setProperty("--debug-console-compact-height", `${nextHeight}px`);
  };
  const handleCompactResizePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    compactResizeRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: compactHeightRef.current,
    };
    setIsCompactResizing(true);
  };
  const handleCompactResizePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const resizeState = compactResizeRef.current;

    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return;
    }

    updateCompactHeight(resizeState.startHeight + resizeState.startY - event.clientY);
  };
  const finishCompactResize = (event: PointerEvent<HTMLButtonElement>) => {
    const resizeState = compactResizeRef.current;

    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return;
    }

    compactResizeRef.current = null;
    setIsCompactResizing(false);
    setCompactHeight(compactHeightRef.current);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const handleCurtainPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    curtainDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startOffset: curtainOffset,
    };
    setIsDraggingCurtain(true);
  };
  const handleCurtainPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const dragState = curtainDragRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    updateCurtainOffset(dragState.startOffset + event.clientY - dragState.startY);
  };
  const finishCurtainDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const dragState = curtainDragRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    curtainDragRef.current = null;
    setIsDraggingCurtain(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const viewportHeight = Math.max(1, window.innerHeight);
    const offsetRatio = curtainOffsetRef.current / viewportHeight;

    if (offsetRatio >= HIDE_CURTAIN_OFFSET_RATIO) {
      onClose();
      return;
    }

    updateCurtainOffset(curtainOffsetRef.current);
  };
  const shellStyle = {
    "--debug-console-curtain-offset": `${curtainOffset}px`,
    "--debug-console-compact-height": `${compactHeight}px`,
  } as CSSProperties;

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <section className="debug-console-fullscreen" role="dialog" aria-modal="true" aria-label="Console">
      <div
        ref={shellRef}
        className="debug-console-fullscreen-shell"
        data-compact={isCompact ? "true" : undefined}
        data-dragging={isDraggingCurtain ? "true" : "false"}
        data-resizing={isCompactResizing ? "true" : undefined}
        style={shellStyle}
      >
        <div className="debug-console-fullscreen-noise" aria-hidden="true" />
        {isCompact ? (
          <button
            type="button"
            className="debug-console-fullscreen-compact-resize"
            aria-label="Resize compact console"
            onPointerDown={handleCompactResizePointerDown}
            onPointerMove={handleCompactResizePointerMove}
            onPointerUp={finishCompactResize}
            onPointerCancel={finishCompactResize}
          />
        ) : null}
        {!isCompact ? (
          <button
            type="button"
            className="debug-console-fullscreen-rail"
            aria-label="Drag Matrix console curtain"
            onPointerDown={handleCurtainPointerDown}
            onPointerMove={handleCurtainPointerMove}
            onPointerUp={finishCurtainDrag}
            onPointerCancel={finishCurtainDrag}
          >
            <span />
          </button>
        ) : null}
        <header className="debug-console-fullscreen-header">
          {isDetailsVisible && !isCompact ? (
            <div>
              <p>SYNC_SESH_OPERATOR</p>
              <h2>Console</h2>
            </div>
          ) : (
            <div aria-hidden="true" />
          )}
          {!isCompact ? (
            <div className="debug-console-fullscreen-status" aria-label="Debug console status">
            <span>{isAutoScrollPinned ? "LIVE" : "PAUSED"}</span>
            <strong>{activeFilter === "all" ? `ALL_${logs.length}` : `${activeFilter.toUpperCase()}_${logs.length}`}</strong>
            </div>
          ) : (
            <div aria-hidden="true" />
          )}
          <div className="debug-console-fullscreen-actions">
            <button
              type="button"
              className="debug-console-fullscreen-toggle-details"
              onClick={() => setIsDetailsVisible((current) => !current)}
              aria-label={isDetailsVisible ? "Hide console details" : "Show console details"}
              aria-pressed={!isDetailsVisible}
              title={isDetailsVisible ? "Hide console details" : "Show console details"}
            >
              i
            </button>
            {!isCompact ? (
              <button
              type="button"
              className="debug-console-fullscreen-compact"
              onClick={() => setIsCompact((current) => !current)}
              aria-label={isCompact ? "Expand console" : "Compact console"}
              aria-pressed={isCompact}
              title={isCompact ? "Expand console" : "Compact console"}
            >
              _
              </button>
            ) : null}
          <button
            type="button"
            className="debug-console-fullscreen-close"
            onClick={onClose}
            aria-label="Hide console"
            title="Hide console"
          >
            ×
          </button>
          </div>
        </header>

        {isDetailsVisible && !isCompact ? (
          <div className="debug-console-fullscreen-snapshot" aria-label="Debug snapshot">
          {snapshotRows.map((row) => (
            <div key={row.key} className="debug-console-fullscreen-snapshot-row">
              <span>{row.label}</span>
              <strong>{formatSnapshotValue(snapshot[row.key])}</strong>
            </div>
          ))}
          </div>
        ) : null}

        <div
          ref={logListRef}
          className="debug-console-fullscreen-log"
          role="log"
          aria-live="polite"
          aria-label="Debug console log"
          onScroll={handleLogScroll}
        >
          {logs.length > 0 ? (
            logs.map((entry) => (
              <div key={entry.id} className={`debug-console-fullscreen-line debug-console-log-level-${entry.level} debug-console-log-kind-${entry.kind}`}>
                <span className="debug-console-fullscreen-time">[{formatDebugConsoleTimestamp(entry.timestamp)}]</span>
                {entry.kind === "command_input" ? (
                  <span className="debug-console-fullscreen-copy">
                    <strong>&gt;</strong>
                    <span>{entry.label}</span>
                  </span>
                ) : (
                  <span className="debug-console-fullscreen-copy">
                    <strong className={`debug-console-log-tag-${entry.category}`}>{entry.category}</strong>
                    <span>{entry.label}</span>
                    {entry.detail ? <em>{entry.detail}</em> : null}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="debug-console-fullscreen-empty">No debug events captured yet.</div>
          )}
        </div>

        <form className="debug-console-fullscreen-command" onSubmit={handleSubmit}>
          <button
            type="button"
            className="debug-console-fullscreen-command-toggle"
            data-compact={isCompact ? "true" : undefined}
            onClick={() => setIsCompact((current) => !current)}
            aria-label={isCompact ? "Expand console" : "Compact console"}
            title={isCompact ? "Expand console" : "Compact console"}
          >
            &gt;
          </button>
          <input
            ref={commandInputRef}
            type="text"
            value={commandValue}
            onChange={(event) => handleCommandValueChange(event.target.value)}
            onKeyDown={handleCommandHistoryKeyDown}
            placeholder="try: float"
            aria-label="Debug console command input"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit">run</button>
        </form>
      </div>
    </section>,
    document.body,
  );
}
