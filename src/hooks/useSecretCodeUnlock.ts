import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_SECRET_CODE = "syncsesh";

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
  const bufferRef = useRef("");
  const secretCode = useMemo(getSecretCode, []);
  const resetSecretEntry = useCallback(() => {
    bufferRef.current = "";
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

      if (nextBuffer === secretCode) {
        setIsSecretUnlocked(true);
        setUnlockCount((currentCount) => currentCount + 1);
        bufferRef.current = "";
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
    resetSecretEntry,
  };
}
