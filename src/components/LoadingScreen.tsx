import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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

interface TrackedConsoleEvent {
  key: string;
  line: string;
  progress: number;
  signature: string;
  status: StartupProgressStep["status"];
}

const TERMINAL_LOG_ENTRY_LIMIT = 80;
const MATRIX_OVERLAY_LINE_COUNT = 42;
const DEFAULT_LOADING_SPEED = 50;
const LOADING_SPEED_INPUT_BOOST = 2;
const MIN_TERMINAL_LOG_PRINT_DELAY_MS = 5;
const DEFAULT_TERMINAL_LOG_PRINT_DELAY_MS = 100;
const MAX_TERMINAL_LOG_PRINT_DELAY_MS = 175;

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

export function LoadingScreen({ progress, diagnostics = [], isPaused = false, onConsoleDrainChange }: LoadingScreenProps) {
  const [terminalLogEntries, setTerminalLogEntries] = useState<TerminalLogEntry[]>([]);
  const [pendingTerminalLogEntries, setPendingTerminalLogEntries] = useState<TerminalLogEntry[]>([]);
  const [isConsoleCaptureClosed, setIsConsoleCaptureClosed] = useState(false);
  const [loadingSpeed, setLoadingSpeed] = useState(DEFAULT_LOADING_SPEED);
  const terminalLogIndexRef = useRef(0);
  const previousConsoleSignaturesRef = useRef<Map<string, string>>(new Map());
  const terminalLogPrintDelayMs = getTerminalLogPrintDelay(loadingSpeed);
  const trackedConsoleEvents = useMemo<TrackedConsoleEvent[]>(() => {
    const stepEvents = progress.steps.map((step, index) => ({
      key: step.id,
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
          line: getDiagnosticConsoleLine(diagnostic, progress.steps.length + 1 + index),
          progress: diagnosticProgress,
          signature: `${status}|${diagnosticProgress}|${diagnostic.detail}`,
          status,
        };
      }),
    ];
  }, [diagnostics, progress.blockingReason, progress.isBlocking, progress.requiredProgress, progress.steps]);
  const matrixOverlayLines = terminalLogEntries.slice(-MATRIX_OVERLAY_LINE_COUNT).map((entry, index) => `${entry.line} // TRACE_${getLogIndex(index)}`);

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
      if (isSpeedControlInput(event.target)) {
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

  return (
    <section className="loading-screen" aria-label="Sync Sesh startup progress" aria-live="polite">
      <div className="loading-screen-matrix-overlay" aria-hidden="true">
        {matrixOverlayLines.map((line, index) => (
          <span className="loading-screen-matrix-overlay-line" key={`${line}-${index}`}>
            {line}
          </span>
        ))}
      </div>

      <div className="loading-screen-shell">
        <div className="loading-screen-terminal-header">
          <div>
            <p className="loading-screen-eyebrow">SYNC_SESH_BOOT</p>
            <h1>Room link protocol</h1>
          </div>
          <div className="loading-screen-terminal-progress">
            <span>required_progress</span>
            <strong>{progress.requiredProgress}%</strong>
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
    </section>
  );
}
