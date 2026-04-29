import { useEffect, useMemo, useRef, useState, type FormEvent, type UIEvent } from "react";
import type { DebugLogEntry } from "../lib/debug/debugConsole";
import { DEBUG_CONSOLE_SNAPSHOT_ROWS, formatDebugConsoleTimestamp, type DebugConsoleFilter, type DebugConsoleSnapshot } from "../hooks/useDebugConsoleState";
import { useDebugCommandHistory } from "../hooks/useDebugCommandHistory";
import { FloatingWindow } from "./FloatingWindow";

interface DebugConsoleWindowProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: DebugConsoleSnapshot;
  logs: DebugLogEntry[];
  commandHistory: string[];
  activeFilter: DebugConsoleFilter;
  onSubmitCommand: (command: string) => void;
}

const DEBUG_CONSOLE_INITIAL_RECT = {
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

export function DebugConsoleWindow({ isOpen, onClose, snapshot, logs, commandHistory, activeFilter, onSubmitCommand }: DebugConsoleWindowProps) {
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
    <FloatingWindow
      title="Discord Activity Debug Console"
      isOpen={isOpen}
      initialRect={DEBUG_CONSOLE_INITIAL_RECT}
      minWidth={320}
      minHeight={300}
      onClose={onClose}
    >
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
          <div
            ref={logListRef}
            className="debug-console-log-list"
            role="log"
            aria-live="polite"
            aria-label="Debug console log"
            onScroll={handleLogScroll}
          >
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
    </FloatingWindow>
  );
}
