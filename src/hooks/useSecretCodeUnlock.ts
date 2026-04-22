import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_SECRET_CODE = "syncsesh";

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

function getSecretCode() {
  const configuredCode = import.meta.env.VITE_3D_SECRET_CODE?.trim().toLowerCase();
  return configuredCode || DEFAULT_SECRET_CODE;
}

export function useSecretCodeUnlock() {
  const [isSecretUnlocked, setIsSecretUnlocked] = useState(false);
  const [unlockCount, setUnlockCount] = useState(0);
  const [entryProgress, setEntryProgress] = useState(0);
  const [entryStepCount, setEntryStepCount] = useState(0);
  const [lastMatchedLength, setLastMatchedLength] = useState(0);
  const bufferRef = useRef("");
  const secretCode = useMemo(getSecretCode, []);
  const resetSecretEntry = useCallback(() => {
    bufferRef.current = "";
    setEntryProgress(0);
    setLastMatchedLength(0);
  }, []);

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

      const nextBuffer = `${bufferRef.current}${event.key.toLowerCase()}`.slice(-secretCode.length);
      bufferRef.current = nextBuffer;
      const nextProgress = getMatchedPrefixLength(nextBuffer, secretCode);
      setEntryProgress(nextProgress);

      if (nextBuffer === secretCode) {
        setIsSecretUnlocked(true);
        setUnlockCount((currentCount) => currentCount + 1);
        bufferRef.current = "";
        setEntryProgress(0);
        setLastMatchedLength(secretCode.length);
        setEntryStepCount((currentCount) => currentCount + 1);
        return;
      }

      if (nextProgress > 0) {
        setLastMatchedLength(nextProgress);
        setEntryStepCount((currentCount) => currentCount + 1);
      } else {
        setLastMatchedLength(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [secretCode]);

  return {
    isSecretUnlocked,
    unlockCount,
    entryProgress,
    entryStepCount,
    lastMatchedLength,
    secretCodeLength: secretCode.length,
    resetSecretEntry,
  };
}
