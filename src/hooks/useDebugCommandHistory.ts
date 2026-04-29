import { useRef, useState, type KeyboardEvent } from "react";

interface UseDebugCommandHistoryOptions {
  commandHistory: string[];
  commandValue: string;
  setCommandValue: (value: string) => void;
}

export function useDebugCommandHistory({ commandHistory, commandValue, setCommandValue }: UseDebugCommandHistoryOptions) {
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const draftCommandRef = useRef("");

  const handleCommandValueChange = (value: string) => {
    setHistoryIndex(null);
    setCommandValue(value);
  };

  const handleCommandHistoryKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }

    if (commandHistory.length === 0) {
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = historyIndex === null ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);

      if (historyIndex === null) {
        draftCommandRef.current = commandValue;
      }

      setHistoryIndex(nextIndex);
      setCommandValue(commandHistory[nextIndex]);
      return;
    }

    if (historyIndex === null) {
      return;
    }

    event.preventDefault();

    if (historyIndex >= commandHistory.length - 1) {
      setHistoryIndex(null);
      setCommandValue(draftCommandRef.current);
      return;
    }

    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setCommandValue(commandHistory[nextIndex]);
  };

  return {
    handleCommandHistoryKeyDown,
    handleCommandValueChange,
  };
}
