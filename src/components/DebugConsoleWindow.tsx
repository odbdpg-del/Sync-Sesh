import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent, type UIEvent } from "react";
import type { DebugLogEntry } from "../lib/debug/debugConsole";
import { DEBUG_CONSOLE_SNAPSHOT_ROWS, formatDebugConsoleTimestamp, type DebugConsoleFilter, type DebugConsoleSnapshot } from "../hooks/useDebugConsoleState";
import { useDebugCommandHistory } from "../hooks/useDebugCommandHistory";
import { FloatingWindow } from "./FloatingWindow";
import type { PanelShellDragInfo, PanelShellRect } from "./PanelShell";

interface DebugConsoleContentProps {
  isOpen: boolean;
  snapshot: DebugConsoleSnapshot;
  logs: DebugLogEntry[];
  commandHistory: string[];
  activeFilter: DebugConsoleFilter;
  onSubmitCommand: (command: string) => void;
}

interface DebugConsoleWindowProps extends DebugConsoleContentProps {
  onClose: () => void;
  floatingRect?: PanelShellRect;
  floatingZIndex?: number;
  onFloatingRectChange?: (rect: PanelShellRect) => void;
  onFloatingInteractionEnd?: () => void;
  onFloatingFocus?: () => void;
  onFloatingDragMove?: (info: PanelShellDragInfo) => void;
  onFloatingDragEnd?: (info: PanelShellDragInfo) => void;
  onDock?: () => void;
  onReset?: () => void;
}

interface DebugConsoleDockedPanelProps extends DebugConsoleContentProps {
  onClose: () => void;
  onFloat: () => void;
  onReset: () => void;
  onDockedDragMove?: (info: DebugConsoleDockedDragInfo) => void;
  onDockedDragEnd?: (info: DebugConsoleDockedDragInfo) => void;
  onDockedDragCancel?: () => void;
}

export interface DebugConsoleDockedDragInfo {
  pointerX: number;
  pointerY: number;
}

export const DEBUG_CONSOLE_INITIAL_RECT = {
  x: 72,
  y: 96,
  width: 560,
  height: 420,
};

function formatSnapshotValue(value: boolean | number | string | undefined) {
  if (value === undefined || value === "") {
    return "n/a";
  }

  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }

  return String(value);
}

export function DebugConsoleContent({ isOpen, snapshot, logs, commandHistory, activeFilter, onSubmitCommand }: DebugConsoleContentProps) {
  const [commandValue, setCommandValue] = useState("");
  const [isSnapshotExpanded, setIsSnapshotExpanded] = useState(false);
  const [isAutoScrollPinned, setIsAutoScrollPinned] = useState(true);
  const logListRef = useRef<HTMLDivElement | null>(null);
  const { handleCommandHistoryKeyDown, handleCommandValueChange } = useDebugCommandHistory({
    commandHistory,
    commandValue,
    setCommandValue,
  });
  const snapshotSummary = useMemo(
    () => `${snapshot.identitySource ?? "n/a"} | ${snapshot.syncConnection} | ${snapshot.authStage ?? "idle"}`,
    [snapshot.authStage, snapshot.identitySource, snapshot.syncConnection],
  );

  useEffect(() => {
    const logList = logListRef.current;

    if (!logList || !isAutoScrollPinned) {
      return;
    }

    logList.scrollTop = logList.scrollHeight;
  }, [isAutoScrollPinned, logs]);

  useEffect(() => {
    if (isOpen) {
      setCommandValue("");
      setIsSnapshotExpanded(false);
      setIsAutoScrollPinned(true);
    }
  }, [isOpen]);

  const handleLogScroll = (event: UIEvent<HTMLDivElement>) => {
    const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) <= 24;
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

  return (
    <div className="debug-console-window">
      <section className="debug-console-panel" aria-labelledby="debug-console-snapshot-heading">
        <button
          type="button"
          className="debug-console-snapshot-toggle"
          aria-expanded={isSnapshotExpanded}
          aria-controls="debug-console-snapshot-body"
          onClick={() => setIsSnapshotExpanded((current) => !current)}
        >
          <span className="debug-console-snapshot-toggle-label">
            <strong id="debug-console-snapshot-heading">Snapshot</strong>
            <small>{snapshotSummary}</small>
          </span>
          <span className="debug-console-snapshot-toggle-meta">
            {isSnapshotExpanded ? "Hide" : "Show"} {DEBUG_CONSOLE_SNAPSHOT_ROWS.length}
          </span>
        </button>
        {isSnapshotExpanded ? (
          <div id="debug-console-snapshot-body" className="debug-console-snapshot-grid">
            {DEBUG_CONSOLE_SNAPSHOT_ROWS.map((row) => (
              <div key={row.key} className="debug-console-snapshot-row">
                <span className="debug-console-snapshot-label">{row.label}</span>
                <strong className="debug-console-snapshot-value">{formatSnapshotValue(snapshot[row.key])}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="debug-console-panel debug-console-log-panel" aria-labelledby="debug-console-log-heading">
        <div className="debug-console-panel-heading">
          <h2 id="debug-console-log-heading">Log</h2>
          <div className="debug-console-log-status">
            <span className={`debug-console-live-indicator ${isAutoScrollPinned ? "debug-console-live-indicator-live" : "debug-console-live-indicator-paused"}`}>
              {isAutoScrollPinned ? "LIVE" : "PAUSED"}
            </span>
            <span className="debug-console-log-filter">
              {activeFilter === "all" ? `ALL ${logs.length}` : `${activeFilter.toUpperCase()} ${logs.length}`}
            </span>
          </div>
        </div>
        <div ref={logListRef} className="debug-console-log-list" role="log" aria-live="polite" aria-label="Debug console log" onScroll={handleLogScroll}>
          {logs.length > 0 ? (
            logs.map((entry) => (
              <div key={entry.id} className={`debug-console-log-line debug-console-log-level-${entry.level} debug-console-log-kind-${entry.kind}`}>
                <span className="debug-console-log-time">[{formatDebugConsoleTimestamp(entry.timestamp)}]</span>
                {entry.kind === "command_input" ? (
                  <div className="debug-console-log-terminal-copy">
                    <span className="debug-console-log-prompt">&gt;</span>
                    <span className="debug-console-log-command">{entry.label}</span>
                  </div>
                ) : (
                  <div className="debug-console-log-terminal-copy">
                    <span className={`debug-console-log-tag debug-console-log-tag-${entry.category}`}>{entry.category}</span>
                    <span className="debug-console-log-message">{entry.label}</span>
                    {entry.detail ? <span className="debug-console-log-detail"> - {entry.detail}</span> : null}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="debug-console-log-empty">No debug events captured yet.</div>
          )}
        </div>
      </section>

      <form className="debug-console-command" onSubmit={handleSubmit}>
        <label htmlFor="debug-console-command-input">
          <span>Command</span>
        </label>
        <div className="debug-console-command-row">
          <span className="debug-console-command-prompt" aria-hidden="true">
            &gt;
          </span>
          <input
            id="debug-console-command-input"
            type="text"
            value={commandValue}
            onChange={(event) => handleCommandValueChange(event.target.value)}
            onKeyDown={handleCommandHistoryKeyDown}
            placeholder="Try: filter auth"
            aria-label="Debug console command input"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="debug-console-command-submit">
            Run
          </button>
        </div>
      </form>
    </div>
  );
}

export function DebugConsoleWindow({
  isOpen,
  onClose,
  snapshot,
  logs,
  commandHistory,
  activeFilter,
  onSubmitCommand,
  floatingRect,
  floatingZIndex,
  onFloatingRectChange,
  onFloatingInteractionEnd,
  onFloatingFocus,
  onFloatingDragMove,
  onFloatingDragEnd,
  onDock,
  onReset,
}: DebugConsoleWindowProps) {
  const actions = (
    <>
      {onDock ? (
        <button type="button" className="panel-shell-action floating-window-action" aria-label="Dock Discord Activity Debug Console" onClick={onDock}>
          Dock
        </button>
      ) : null}
      {onReset ? (
        <button type="button" className="panel-shell-action floating-window-action" aria-label="Reset Discord Activity Debug Console position" onClick={onReset}>
          Reset
        </button>
      ) : null}
    </>
  );

  return (
    <FloatingWindow
      title="Discord Activity Debug Console"
      isOpen={isOpen}
      initialRect={DEBUG_CONSOLE_INITIAL_RECT}
      rect={floatingRect}
      zIndex={floatingZIndex}
      minWidth={320}
      minHeight={300}
      onClose={onClose}
      onRectChange={onFloatingRectChange}
      onInteractionEnd={onFloatingInteractionEnd}
      onFocusPanel={onFloatingFocus}
      onDragMove={onFloatingDragMove}
      onDragEnd={onFloatingDragEnd}
      actions={actions}
    >
      <DebugConsoleContent
        isOpen={isOpen}
        snapshot={snapshot}
        logs={logs}
        commandHistory={commandHistory}
        activeFilter={activeFilter}
        onSubmitCommand={onSubmitCommand}
      />
    </FloatingWindow>
  );
}

export function DebugConsoleDockedPanel({
  isOpen,
  onClose,
  onFloat,
  onReset,
  snapshot,
  logs,
  commandHistory,
  activeFilter,
  onSubmitCommand,
  onDockedDragMove,
  onDockedDragEnd,
  onDockedDragCancel,
}: DebugConsoleDockedPanelProps) {
  const activePointerIdRef = useRef<number | null>(null);
  const capturedHeaderRef = useRef<HTMLElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      const pointerId = activePointerIdRef.current;
      const capturedHeader = capturedHeaderRef.current;

      if (pointerId !== null && capturedHeader?.hasPointerCapture(pointerId)) {
        capturedHeader.releasePointerCapture(pointerId);
      }

      activePointerIdRef.current = null;
      capturedHeaderRef.current = null;
      setIsDragging(false);
      onDockedDragCancel?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDragging, onDockedDragCancel]);

  const handleHeaderPointerDown = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    capturedHeaderRef.current = event.currentTarget;
    setIsDragging(true);
    onDockedDragMove?.({ pointerX: event.clientX, pointerY: event.clientY });
  };

  const handleHeaderPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    onDockedDragMove?.({ pointerX: event.clientX, pointerY: event.clientY });
  };

  const handleHeaderPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    activePointerIdRef.current = null;
    capturedHeaderRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onDockedDragEnd?.({ pointerX: event.clientX, pointerY: event.clientY });
  };

  return (
    <section className="debug-console-docked-panel" aria-label="Discord Activity Debug Console" data-dragging={isDragging ? "true" : undefined}>
      <header
        className="debug-console-docked-header"
        tabIndex={0}
        aria-label="Drag Discord Activity Debug Console docked panel"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
      >
        <strong>Discord Activity Debug Console</strong>
        <div className="debug-console-docked-actions" onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" aria-label="Float Discord Activity Debug Console" onClick={onFloat}>
            Float
          </button>
          <button type="button" aria-label="Close Discord Activity Debug Console" onClick={onClose}>
            Close
          </button>
          <button type="button" aria-label="Reset Discord Activity Debug Console position" onClick={onReset}>
            Reset
          </button>
        </div>
      </header>
      <div className="debug-console-docked-body">
        <DebugConsoleContent
          isOpen={isOpen}
          snapshot={snapshot}
          logs={logs}
          commandHistory={commandHistory}
          activeFilter={activeFilter}
          onSubmitCommand={onSubmitCommand}
        />
      </div>
    </section>
  );
}
