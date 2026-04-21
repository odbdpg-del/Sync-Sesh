import { useEffect, useState } from "react";

const APP_ZOOM_STORAGE_KEY = "syncsesh.app-zoom";
const MIN_ZOOM_PERCENT = 70;
const MAX_ZOOM_PERCENT = 150;
const DEFAULT_ZOOM_PERCENT = 100;
const ZOOM_STEP_PERCENT = 5;

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    tagName === "button" ||
    tagName === "a" ||
    target.isContentEditable
  );
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM_PERCENT, Math.max(MIN_ZOOM_PERCENT, value));
}

function readInitialZoom() {
  const storedValue = window.localStorage.getItem(APP_ZOOM_STORAGE_KEY);
  const parsedValue = storedValue ? Number(storedValue) : DEFAULT_ZOOM_PERCENT;

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_ZOOM_PERCENT;
  }

  return clampZoom(parsedValue);
}

export function useAppViewportControls() {
  const [zoomPercent, setZoomPercent] = useState(DEFAULT_ZOOM_PERCENT);

  useEffect(() => {
    const initialZoom = readInitialZoom();
    setZoomPercent(initialZoom);
    document.documentElement.style.setProperty("--app-zoom", `${initialZoom}%`);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--app-zoom", `${zoomPercent}%`);
    window.localStorage.setItem(APP_ZOOM_STORAGE_KEY, String(zoomPercent));
  }, [zoomPercent]);

  useEffect(() => {
    const shouldBlockSpaceScroll = (event: KeyboardEvent) => (
      event.code === "Space" &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !isInteractiveTarget(event.target)
    );

    const blockSpaceScroll = (event: KeyboardEvent) => {
      if (!shouldBlockSpaceScroll(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat && shouldBlockSpaceScroll(event)) {
        blockSpaceScroll(event);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      blockSpaceScroll(event);
    };

    const handleKeyPress = (event: KeyboardEvent) => {
      blockSpaceScroll(event);
    };

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) {
        return;
      }

      event.preventDefault();
      setZoomPercent((currentZoom) => clampZoom(currentZoom + (event.deltaY < 0 ? ZOOM_STEP_PERCENT : -ZOOM_STEP_PERCENT)));
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    window.addEventListener("keypress", handleKeyPress, { capture: true });
    window.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("keydown", blockSpaceScroll, { capture: true });
    document.addEventListener("keyup", blockSpaceScroll, { capture: true });
    document.addEventListener("keypress", blockSpaceScroll, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      window.removeEventListener("keypress", handleKeyPress, { capture: true });
      window.removeEventListener("wheel", handleWheel);
      document.removeEventListener("keydown", blockSpaceScroll, { capture: true });
      document.removeEventListener("keyup", blockSpaceScroll, { capture: true });
      document.removeEventListener("keypress", blockSpaceScroll, { capture: true });
    };
  }, []);

  return {
    zoomPercent,
  };
}
