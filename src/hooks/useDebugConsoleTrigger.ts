import { useEffect, useMemo, useRef } from "react";

const DEFAULT_DEBUG_CONSOLE_CODE = "console";

function getMatchedPrefixLength(buffer: string, secretCode: string) {
  const maxLength = Math.min(buffer.length, secretCode.length);

  for (let length = maxLength; length > 0; length -= 1) {
    if (buffer.slice(-length) === secretCode.slice(0, length)) {
      return length;
    }
  }

  return 0;
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function useDebugConsoleTrigger(onMatch: () => void, sequence = DEFAULT_DEBUG_CONSOLE_CODE) {
  const bufferRef = useRef("");
  const normalizedSequence = useMemo(() => sequence.trim().toLowerCase() || DEFAULT_DEBUG_CONSOLE_CODE, [sequence]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isInteractiveTarget(event.target) ||
        event.key.length !== 1
      ) {
        return;
      }

      const nextBuffer = `${bufferRef.current}${event.key.toLowerCase()}`.slice(-normalizedSequence.length);
      bufferRef.current = nextBuffer;

      if (nextBuffer === normalizedSequence) {
        bufferRef.current = "";
        onMatch();
        return;
      }

      const nextProgress = getMatchedPrefixLength(nextBuffer, normalizedSequence);
      bufferRef.current = nextProgress > 0 ? nextBuffer : "";
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [normalizedSequence, onMatch]);
}
