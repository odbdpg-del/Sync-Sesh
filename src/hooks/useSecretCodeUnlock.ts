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
  const [errorCount, setErrorCount] = useState(0);
  const [errorProgress, setErrorProgress] = useState(0);
  const bufferRef = useRef("");
  const progressRef = useRef(0);
  const errorResetTimeoutRef = useRef<number | undefined>();
  const secretCode = useMemo(getSecretCode, []);
  const resetSecretEntry = useCallback(() => {
    bufferRef.current = "";
    setEntryProgress(0);
    setLastMatchedLength(0);
    progressRef.current = 0;

    if (errorResetTimeoutRef.current) {
      window.clearTimeout(errorResetTimeoutRef.current);
      errorResetTimeoutRef.current = undefined;
    }

    setErrorProgress(0);
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

      const currentProgress = progressRef.current;
      const pressedKey = event.key.toLowerCase();
      const expectedKey = secretCode[currentProgress];
      const didMissActiveSequence = currentProgress > 0 && pressedKey !== expectedKey;

      if (didMissActiveSequence) {
        if (errorResetTimeoutRef.current) {
          window.clearTimeout(errorResetTimeoutRef.current);
        }

        setErrorProgress(currentProgress);
        setErrorCount((currentCount) => currentCount + 1);
        errorResetTimeoutRef.current = window.setTimeout(() => {
          setErrorProgress(0);
          errorResetTimeoutRef.current = undefined;
        }, 420);
      }

      const nextBuffer = `${bufferRef.current}${event.key.toLowerCase()}`.slice(-secretCode.length);
      bufferRef.current = nextBuffer;
      const nextProgress = getMatchedPrefixLength(nextBuffer, secretCode);
      progressRef.current = nextProgress;
      setEntryProgress(nextProgress);

      if (nextBuffer === secretCode) {
        setIsSecretUnlocked(true);
        setUnlockCount((currentCount) => currentCount + 1);
        bufferRef.current = "";
        progressRef.current = 0;
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

      if (errorResetTimeoutRef.current) {
        window.clearTimeout(errorResetTimeoutRef.current);
      }
    };
  }, [secretCode]);

  return {
    isSecretUnlocked,
    unlockCount,
    entryProgress,
    entryStepCount,
    lastMatchedLength,
    errorCount,
    errorProgress,
    secretCodeLength: secretCode.length,
    resetSecretEntry,
  };
}
