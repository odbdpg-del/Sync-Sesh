import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent, type UIEvent } from "react";
import { DEBUG_CONSOLE_SNAPSHOT_ROWS, formatDebugConsoleTimestamp, type DebugConsoleFilter, type DebugConsoleSnapshot } from "../hooks/useDebugConsoleState";
import type { DebugLogEntry } from "../lib/debug/debugConsole";

interface DebugConsoleFullscreenProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: DebugConsoleSnapshot;
  logs: DebugLogEntry[];
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
const SNAP_BACK_OFFSET_RATIO = 0.22;
const HIDE_CURTAIN_OFFSET_RATIO = 0.7;

interface CurtainDragState {
  pointerId: number;
  startY: number;
  startOffset: number;
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

export function DebugConsoleFullscreen({ isOpen, onClose, snapshot, logs, activeFilter, onSubmitCommand }: DebugConsoleFullscreenProps) {
  const [commandValue, setCommandValue] = useState("");
  const [isAutoScrollPinned, setIsAutoScrollPinned] = useState(true);
  const [curtainOffset, setCurtainOffset] = useState(0);
  const [isDraggingCurtain, setIsDraggingCurtain] = useState(false);
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const logListRef = useRef<HTMLDivElement | null>(null);
  const curtainDragRef = useRef<CurtainDragState | null>(null);
  const curtainOffsetRef = useRef(0);
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
    curtainDragRef.current = null;
    window.setTimeout(() => commandInputRef.current?.focus(), 0);
  }, [isOpen]);

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
    setCommandValue("");
  };
  const updateCurtainOffset = (value: number) => {
    const nextOffset = Math.max(0, Math.min(window.innerHeight, value));
    curtainOffsetRef.current = nextOffset;
    setCurtainOffset(nextOffset);
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

    if (offsetRatio < SNAP_BACK_OFFSET_RATIO) {
      updateCurtainOffset(0);
      return;
    }

    if (offsetRatio >= HIDE_CURTAIN_OFFSET_RATIO) {
      onClose();
      return;
    }

    updateCurtainOffset(curtainOffsetRef.current);
  };
  const shellStyle = { "--debug-console-curtain-offset": `${curtainOffset}px` } as CSSProperties;

  if (!isOpen) {
    return null;
  }

  return (
    <section className="debug-console-fullscreen" role="dialog" aria-modal="true" aria-label="Matrix debug console">
      <div className="debug-console-fullscreen-shell" data-dragging={isDraggingCurtain ? "true" : "false"} style={shellStyle}>
        <div className="debug-console-fullscreen-noise" aria-hidden="true" />
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
        <header className="debug-console-fullscreen-header">
          <div>
            <p>SYNC_SESH_OPERATOR</p>
            <h2>Matrix debug console</h2>
          </div>
          <div className="debug-console-fullscreen-status" aria-label="Debug console status">
            <span>{isAutoScrollPinned ? "LIVE" : "PAUSED"}</span>
            <strong>{activeFilter === "all" ? `ALL_${logs.length}` : `${activeFilter.toUpperCase()}_${logs.length}`}</strong>
          </div>
          <button type="button" className="debug-console-fullscreen-close" onClick={onClose}>
            hide
          </button>
        </header>

        <div className="debug-console-fullscreen-snapshot" aria-label="Debug snapshot">
          {snapshotRows.map((row) => (
            <div key={row.key} className="debug-console-fullscreen-snapshot-row">
              <span>{row.label}</span>
              <strong>{formatSnapshotValue(snapshot[row.key])}</strong>
            </div>
          ))}
        </div>

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
          <span aria-hidden="true">&gt;</span>
          <input
            ref={commandInputRef}
            type="text"
            value={commandValue}
            onChange={(event) => setCommandValue(event.target.value)}
            placeholder="try: float"
            aria-label="Debug console command input"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit">run</button>
        </form>
      </div>
    </section>
  );
}
