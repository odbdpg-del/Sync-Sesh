import { useEffect, useMemo, useRef, useState } from "react";

interface UseReadyHoldOptions {
  enabled: boolean;
  keyboardEnabled?: boolean;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function useReadyHold({ enabled, keyboardEnabled = true, onHoldStart, onHoldEnd }: UseReadyHoldOptions) {
  const [isHolding, setIsHolding] = useState(false);
  const activeSourcesRef = useRef(new Set<"keyboard" | "pointer">());

  useEffect(() => {
    if (!enabled) {
      activeSourcesRef.current.clear();
      setIsHolding(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (keyboardEnabled || !activeSourcesRef.current.has("keyboard")) {
      return;
    }

    activeSourcesRef.current.delete("keyboard");

    if (activeSourcesRef.current.size === 0) {
      setIsHolding(false);
      onHoldEnd();
    }
  }, [keyboardEnabled, onHoldEnd]);

  useEffect(() => {
    if (!enabled || !keyboardEnabled) {
      return;
    }

    const activate = (source: "keyboard" | "pointer") => {
      if (activeSourcesRef.current.has(source)) {
        return;
      }

      const wasIdle = activeSourcesRef.current.size === 0;
      activeSourcesRef.current.add(source);

      if (wasIdle) {
        setIsHolding(true);
        onHoldStart();
      }
    };

    const release = (source: "keyboard" | "pointer") => {
      if (!activeSourcesRef.current.has(source)) {
        return;
      }

      activeSourcesRef.current.delete(source);

      if (activeSourcesRef.current.size === 0) {
        setIsHolding(false);
        onHoldEnd();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || isInteractiveTarget(event.target)) {
        return;
      }

      event.preventDefault();
      activate("keyboard");
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      event.preventDefault();
      release("keyboard");
    };

    const handleBlur = () => {
      release("keyboard");
      release("pointer");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [enabled, keyboardEnabled, onHoldEnd, onHoldStart]);

  const bindHoldButton = useMemo(
    () => ({
      onPointerDown: () => {
        if (!enabled) {
          return;
        }

        const wasIdle = activeSourcesRef.current.size === 0;
        activeSourcesRef.current.add("pointer");

        if (wasIdle) {
          setIsHolding(true);
          onHoldStart();
        }
      },
      onPointerUp: () => {
        if (!activeSourcesRef.current.has("pointer")) {
          return;
        }

        activeSourcesRef.current.delete("pointer");

        if (activeSourcesRef.current.size === 0) {
          setIsHolding(false);
          onHoldEnd();
        }
      },
      onPointerCancel: () => {
        if (!activeSourcesRef.current.has("pointer")) {
          return;
        }

        activeSourcesRef.current.delete("pointer");

        if (activeSourcesRef.current.size === 0) {
          setIsHolding(false);
          onHoldEnd();
        }
      },
      onPointerLeave: () => {
        if (!activeSourcesRef.current.has("pointer")) {
          return;
        }

        activeSourcesRef.current.delete("pointer");

        if (activeSourcesRef.current.size === 0) {
          setIsHolding(false);
          onHoldEnd();
        }
      },
    }),
    [enabled, onHoldEnd, onHoldStart],
  );

  return {
    isHolding,
    bindHoldButton,
  };
}
