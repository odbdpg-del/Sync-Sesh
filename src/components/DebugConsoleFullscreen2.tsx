import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type UIEvent,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { useDebugCommandHistory } from "../hooks/useDebugCommandHistory";
import type { DebugLogEntry } from "../lib/debug/debugConsole";

interface DebugConsoleFullscreen2Props {
  isOpen: boolean;
  openRequestId: number;
  closeRequestId: number;
  startMode: Fullscreen2ConsoleMode;
  backgroundOpacityPercent: number;
  commandBackgroundOpacityPercent: number;
  textOpacityPercent: number;
  logs: DebugLogEntry[];
  commandHistory: string[];
  onCloseAnimationEnd: () => void;
  onRequestClose: () => void;
  onApplyModePreset: (mode: Fullscreen2ConsoleMode) => void;
  onSubmitCommand: (command: string) => void;
}

const FULLSCREEN2_LINE_COUNT = 42;
const FULLSCREEN2_INPUT_HEIGHT = 42;
const FULLSCREEN2_MIN_COMPACT_HEIGHT = 180;
const FULLSCREEN2_COMPACT_HEIGHT_RATIO = 1 / 3;

export type Fullscreen2ConsoleMode = "input" | "compact" | "full";

interface CurtainDragState {
  pointerId: number;
  startY: number;
  startOffset: number;
}

function formatFullscreen2Line(entry: DebugLogEntry, index: number) {
  const entryIndex = index.toString().padStart(2, "0");

  if (entry.kind === "command_input") {
    return `${entryIndex} > COMMAND :: ${entry.label}`;
  }

  const detail = entry.detail ? ` :: ${entry.detail}` : "";
  return `${entryIndex} > ${entry.category.toUpperCase()} :: ${entry.label}${detail}`;
}

function getTextAlphaSet(textOpacityPercent: number) {
  if (textOpacityPercent >= 100) {
    return {
      base: 1,
      even: 1,
      third: 1,
    };
  }

  const base = textOpacityPercent / 100;

  return {
    base,
    even: base * (0.13 / 0.18),
    third: Math.min(1, base * (0.22 / 0.18)),
  };
}

function getViewportHeight() {
  return Math.max(1, window.innerHeight);
}

function getFullscreen2CompactHeight() {
  const viewportHeight = getViewportHeight();
  return Math.min(viewportHeight, Math.max(FULLSCREEN2_MIN_COMPACT_HEIGHT, Math.round(viewportHeight * FULLSCREEN2_COMPACT_HEIGHT_RATIO)));
}

function getFullscreen2ModeOffset(mode: Fullscreen2ConsoleMode) {
  const viewportHeight = getViewportHeight();

  if (mode === "full") {
    return 0;
  }

  if (mode === "compact") {
    return Math.max(0, viewportHeight - getFullscreen2CompactHeight());
  }

  return Math.max(0, viewportHeight - FULLSCREEN2_INPUT_HEIGHT);
}

function getFullscreen2ModeFromOffset(offset: number): Fullscreen2ConsoleMode {
  const viewportHeight = getViewportHeight();
  const visibleHeight = viewportHeight - offset;

  if (visibleHeight <= FULLSCREEN2_INPUT_HEIGHT + 36) {
    return "input";
  }

  if (offset <= 12 || visibleHeight >= viewportHeight * 0.82) {
    return "full";
  }

  return "compact";
}

function getNextFullscreen2Mode(mode: Fullscreen2ConsoleMode): Fullscreen2ConsoleMode {
  if (mode === "input") {
    return "compact";
  }

  if (mode === "compact") {
    return "full";
  }

  return "input";
}

function getFullscreen2ModeGlyph(mode: Fullscreen2ConsoleMode) {
  switch (mode) {
    case "compact":
      return "^";
    case "full":
      return "<";
    case "input":
      return ">";
  }
}

function getFullscreen2ShortcutMode(event: KeyboardEvent<HTMLInputElement>): Fullscreen2ConsoleMode | null {
  if (event.code === "Digit1" || event.code === "Numpad1" || event.key === "1") {
    return "input";
  }

  if (event.code === "Digit2" || event.code === "Numpad2" || event.key === "2") {
    return "compact";
  }

  if (event.code === "Digit3" || event.code === "Numpad3" || event.key === "3") {
    return "full";
  }

  return null;
}

export function DebugConsoleFullscreen2({
  isOpen,
  openRequestId,
  closeRequestId,
  startMode,
  backgroundOpacityPercent,
  commandBackgroundOpacityPercent,
  textOpacityPercent,
  logs,
  commandHistory,
  onCloseAnimationEnd,
  onRequestClose,
  onApplyModePreset,
  onSubmitCommand,
}: DebugConsoleFullscreen2Props) {
  const [commandValue, setCommandValue] = useState("");
  const [consoleMode, setConsoleMode] = useState<Fullscreen2ConsoleMode>(startMode);
  const [curtainOffset, setCurtainOffset] = useState(() => (typeof window === "undefined" ? 0 : getFullscreen2ModeOffset(startMode)));
  const [isDraggingCurtain, setIsDraggingCurtain] = useState(false);
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const linesRef = useRef<HTMLDivElement | null>(null);
  const curtainOffsetRef = useRef(0);
  const curtainDragRef = useRef<CurtainDragState | null>(null);
  const shouldStickToLatestRef = useRef(true);
  const openingFrameRef = useRef<number | null>(null);
  const closingTimeoutRef = useRef<number | null>(null);
  const onCloseAnimationEndRef = useRef(onCloseAnimationEnd);
  const visibleLines = useMemo(() => logs.slice(-FULLSCREEN2_LINE_COUNT).map(formatFullscreen2Line), [logs]);
  const textAlphaSet = getTextAlphaSet(textOpacityPercent);
  const { handleCommandHistoryKeyDown, handleCommandValueChange } = useDebugCommandHistory({
    commandHistory,
    commandValue,
    setCommandValue,
  });
  const shellStyle = {
    "--debug-console-fullscreen2-bg-alpha": `${backgroundOpacityPercent / 100}`,
    "--debug-console-fullscreen2-command-bg-alpha": `${commandBackgroundOpacityPercent / 100}`,
    "--debug-console-fullscreen2-text-alpha": `${textAlphaSet.base}`,
    "--debug-console-fullscreen2-text-even-alpha": `${textAlphaSet.even}`,
    "--debug-console-fullscreen2-text-third-alpha": `${textAlphaSet.third}`,
    "--debug-console-fullscreen2-offset": `${curtainOffset}px`,
  } as CSSProperties;

  useLayoutEffect(() => {
    onCloseAnimationEndRef.current = onCloseAnimationEnd;
  }, [onCloseAnimationEnd]);

  useLayoutEffect(() => {
    if (!isOpen) {
      if (openingFrameRef.current !== null) {
        window.cancelAnimationFrame(openingFrameRef.current);
        openingFrameRef.current = null;
      }
      if (closingTimeoutRef.current !== null) {
        window.clearTimeout(closingTimeoutRef.current);
        closingTimeoutRef.current = null;
      }
      return;
    }

    if (openingFrameRef.current !== null) {
      window.cancelAnimationFrame(openingFrameRef.current);
      openingFrameRef.current = null;
    }
    if (closingTimeoutRef.current !== null) {
      window.clearTimeout(closingTimeoutRef.current);
      closingTimeoutRef.current = null;
    }

    setCommandValue("");
    setConsoleMode(startMode);
    setIsDraggingCurtain(false);
    shouldStickToLatestRef.current = true;
    curtainDragRef.current = null;

    if (startMode === "input") {
      const viewportHeight = getViewportHeight();
      setCurtainOffset(viewportHeight);
      curtainOffsetRef.current = viewportHeight;
      openingFrameRef.current = window.requestAnimationFrame(() => {
        openingFrameRef.current = null;
        const nextOffset = getFullscreen2ModeOffset("input");
        setCurtainOffset(nextOffset);
        curtainOffsetRef.current = nextOffset;
      });
    } else {
      setCurtainOffset(getFullscreen2ModeOffset(startMode));
      curtainOffsetRef.current = getFullscreen2ModeOffset(startMode);
    }

    window.setTimeout(() => commandInputRef.current?.focus(), 0);
    window.setTimeout(() => {
      const linesElement = linesRef.current;
      if (linesElement) {
        linesElement.scrollTop = linesElement.scrollHeight;
      }
    }, 0);

    return () => {
      if (openingFrameRef.current !== null) {
        window.cancelAnimationFrame(openingFrameRef.current);
        openingFrameRef.current = null;
      }
    };
  }, [isOpen, openRequestId, startMode]);

  useLayoutEffect(() => {
    if (!isOpen || !shouldStickToLatestRef.current) {
      return;
    }

    const linesElement = linesRef.current;
    if (!linesElement) {
      return;
    }

    linesElement.scrollTop = linesElement.scrollHeight;
  }, [curtainOffset, isOpen, visibleLines]);

  useLayoutEffect(() => {
    if (!isOpen || closeRequestId === 0) {
      return;
    }

    if (openingFrameRef.current !== null) {
      window.cancelAnimationFrame(openingFrameRef.current);
      openingFrameRef.current = null;
    }

    setIsDraggingCurtain(false);
    curtainDragRef.current = null;

    const viewportHeight = getViewportHeight();
    setCurtainOffset(viewportHeight);
    curtainOffsetRef.current = viewportHeight;

    if (closingTimeoutRef.current !== null) {
      window.clearTimeout(closingTimeoutRef.current);
    }

    closingTimeoutRef.current = window.setTimeout(() => {
      closingTimeoutRef.current = null;
      onCloseAnimationEndRef.current();
    }, 190);

    return () => {
      if (closingTimeoutRef.current !== null) {
        window.clearTimeout(closingTimeoutRef.current);
        closingTimeoutRef.current = null;
      }
    };
  }, [closeRequestId, isOpen]);

  const updateCurtainOffset = (value: number) => {
    const viewportHeight = getViewportHeight();
    const nextOffset = Math.max(0, Math.min(viewportHeight - FULLSCREEN2_INPUT_HEIGHT, value));
    curtainOffsetRef.current = nextOffset;
    setCurtainOffset(nextOffset);
  };

  const handleLinesScroll = (event: UIEvent<HTMLDivElement>) => {
    const linesElement = event.currentTarget;
    const distanceFromBottom = linesElement.scrollHeight - (linesElement.scrollTop + linesElement.clientHeight);
    shouldStickToLatestRef.current = distanceFromBottom <= 32;
  };

  const setModeOffset = (mode: Fullscreen2ConsoleMode) => {
    setConsoleMode(mode);
    updateCurtainOffset(getFullscreen2ModeOffset(mode));
  };

  const handleModeToggle = () => {
    const nextMode = getNextFullscreen2Mode(consoleMode);
    onApplyModePreset(nextMode);
    setModeOffset(nextMode);
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

    updateCurtainOffset(curtainOffsetRef.current);
    setConsoleMode(getFullscreen2ModeFromOffset(curtainOffsetRef.current));
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

  const handleCommandKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.code === "Backquote" && commandValue.length === 0) {
      event.preventDefault();
      onRequestClose();
      return;
    }

    const shortcutMode = commandValue.length === 0 ? getFullscreen2ShortcutMode(event) : null;
    if (shortcutMode) {
      event.preventDefault();
      onApplyModePreset(shortcutMode);
      setModeOffset(shortcutMode);
      return;
    }

    handleCommandHistoryKeyDown(event);
  };

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <section className="debug-console-fullscreen2" role="dialog" aria-modal="true" aria-label="Background console">
      <div
        className="debug-console-fullscreen2-shell"
        data-mode={consoleMode}
        data-dragging={isDraggingCurtain ? "true" : undefined}
        style={shellStyle}
      >
        <button
          type="button"
          className="debug-console-fullscreen2-edge"
          aria-label="Drag background console curtain"
          onPointerDown={handleCurtainPointerDown}
          onPointerMove={handleCurtainPointerMove}
          onPointerUp={finishCurtainDrag}
          onPointerCancel={finishCurtainDrag}
        />
        <div ref={linesRef} className="debug-console-fullscreen2-lines" aria-label="Debug console output" onScroll={handleLinesScroll}>
          {visibleLines.map((line, index) => (
            <span className="debug-console-fullscreen2-line" key={`${line}-${index}`}>
              {line} // TRACE_{index.toString().padStart(2, "0")}
            </span>
          ))}
        </div>
        <form className="debug-console-fullscreen2-command" onSubmit={handleSubmit}>
          <button
            type="button"
            className="debug-console-fullscreen2-mode-toggle"
            onClick={handleModeToggle}
            aria-label={`Switch background console from ${consoleMode} mode`}
            title={`Switch background console from ${consoleMode} mode`}
          >
            {getFullscreen2ModeGlyph(consoleMode)}
          </button>
          <input
            ref={commandInputRef}
            type="text"
            value={commandValue}
            onChange={(event) => handleCommandValueChange(event.target.value)}
            onKeyDown={handleCommandKeyDown}
            placeholder="help"
            aria-label="Debug console command input"
            autoComplete="off"
            spellCheck={false}
          />
        </form>
      </div>
    </section>,
    document.body,
  );
}
