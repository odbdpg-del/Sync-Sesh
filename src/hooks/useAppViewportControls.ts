import { useEffect, useState } from "react";

const APP_ZOOM_STORAGE_KEY = "syncsesh.app-zoom";
const PANEL_OPACITY_STORAGE_KEY = "syncsesh.panel-opacity";
const MIN_ZOOM_PERCENT = 70;
const MAX_ZOOM_PERCENT = 150;
const DEFAULT_ZOOM_PERCENT = 100;
const ZOOM_STEP_PERCENT = 5;
const MIN_PANEL_OPACITY_PERCENT = 0;
const MAX_PANEL_OPACITY_PERCENT = 100;
const DEFAULT_PANEL_OPACITY_PERCENT = 93;

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

function clampPanelOpacity(value: number) {
  return Math.min(MAX_PANEL_OPACITY_PERCENT, Math.max(MIN_PANEL_OPACITY_PERCENT, value));
}

function readInitialZoom() {
  const storedValue = window.localStorage.getItem(APP_ZOOM_STORAGE_KEY);
  const parsedValue = storedValue ? Number(storedValue) : DEFAULT_ZOOM_PERCENT;

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_ZOOM_PERCENT;
  }

  return clampZoom(parsedValue);
}

function readInitialPanelOpacity() {
  const storedValue = window.localStorage.getItem(PANEL_OPACITY_STORAGE_KEY);
  const parsedValue = storedValue ? Number(storedValue) : DEFAULT_PANEL_OPACITY_PERCENT;

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_PANEL_OPACITY_PERCENT;
  }

  return clampPanelOpacity(parsedValue);
}

function formatPanelBackground(alpha: number) {
  return `rgba(7, 13, 24, ${Math.max(0, alpha * 0.78)})`;
}

function formatPanelStrongBackground(alpha: number) {
  return `rgba(5, 11, 21, ${Math.max(0, alpha * 0.9)})`;
}

function formatCardBackground(alpha: number) {
  return `rgba(10, 18, 32, ${Math.max(0, alpha * 0.72)})`;
}

function formatElevatedBackgroundTop(alpha: number) {
  return `rgba(8, 16, 31, ${Math.max(0, alpha * 0.62)})`;
}

function formatElevatedBackgroundBottom(alpha: number) {
  return `rgba(7, 13, 24, ${Math.max(0, alpha * 0.4)})`;
}

function formatHeaderBackgroundTop(alpha: number) {
  return `rgba(14, 25, 36, ${Math.max(0, alpha * 0.7)})`;
}

function formatHeaderBackgroundBottom(alpha: number) {
  return `rgba(8, 17, 28, ${Math.max(0, alpha * 0.78)})`;
}

function formatHeaderPillTop(alpha: number) {
  return `rgba(20, 30, 38, ${Math.max(0, alpha * 0.68)})`;
}

function formatHeaderPillBottom(alpha: number) {
  return `rgba(13, 23, 32, ${Math.max(0, alpha * 0.74)})`;
}

function formatHeadlineShellTop(alpha: number) {
  return `rgba(16, 29, 39, ${Math.max(0, alpha * 0.62)})`;
}

function formatHeadlineShellBottom(alpha: number) {
  return `rgba(10, 19, 28, ${Math.max(0, alpha * 0.66)})`;
}

function formatChipBackground(alpha: number) {
  return `rgba(8, 17, 31, ${Math.max(0, alpha * 0.92)})`;
}

function formatButtonBackground(alpha: number) {
  return `rgba(8, 15, 28, ${Math.max(0, alpha * 0.94)})`;
}

function formatConfigBackground(alpha: number) {
  return `rgba(5, 12, 24, ${Math.max(0, alpha * 0.82)})`;
}

function formatAccentTopBackground(alpha: number) {
  return `rgba(7, 34, 35, ${Math.max(0, alpha * 0.92)})`;
}

function formatAccentBottomBackground(alpha: number) {
  return `rgba(5, 19, 32, ${Math.max(0, alpha * 0.94)})`;
}

function formatVioletTopBackground(alpha: number) {
  return `rgba(70, 31, 148, ${Math.max(0, alpha * 0.18)})`;
}

function formatVioletBottomBackground(alpha: number) {
  return `rgba(11, 17, 31, ${Math.max(0, alpha * 0.92)})`;
}

function formatLogoFrameTop(alpha: number) {
  return `rgba(13, 28, 39, ${Math.max(0, alpha * 0.98)})`;
}

function formatLogoFrameBottom(alpha: number) {
  return `rgba(7, 16, 25, ${Math.max(0, alpha * 0.98)})`;
}

function formatLogoInnerCenter(alpha: number) {
  return `rgba(8, 18, 28, ${Math.max(0, alpha * 0.2)})`;
}

function formatLogoInnerBottom(alpha: number) {
  return `rgba(5, 11, 18, ${Math.max(0, alpha * 0.84)})`;
}

function formatHeadlineAccent(alpha: number) {
  return `${Math.max(0, alpha * 0.08)}`;
}

function formatHeadlineRail(alpha: number) {
  return `${Math.max(0, alpha * 0.82)}`;
}

function formatHeadlineRailTail(alpha: number) {
  return `${Math.max(0, alpha * 0.08)}`;
}

export function useAppViewportControls() {
  const [zoomPercent, setZoomPercent] = useState(DEFAULT_ZOOM_PERCENT);
  const [panelOpacityPercent, setPanelOpacityPercent] = useState(DEFAULT_PANEL_OPACITY_PERCENT);

  useEffect(() => {
    const initialZoom = readInitialZoom();
    const initialPanelOpacity = readInitialPanelOpacity();
    setZoomPercent(initialZoom);
    setPanelOpacityPercent(initialPanelOpacity);
    document.documentElement.style.setProperty("--app-zoom", `${initialZoom}%`);
    document.documentElement.style.setProperty("--bg-panel", formatPanelBackground(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-panel-strong", formatPanelStrongBackground(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-card", formatCardBackground(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-elevated-top", formatElevatedBackgroundTop(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-elevated-bottom", formatElevatedBackgroundBottom(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-header-top", formatHeaderBackgroundTop(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-header-bottom", formatHeaderBackgroundBottom(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-header-pill-top", formatHeaderPillTop(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-header-pill-bottom", formatHeaderPillBottom(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-headline-shell-top", formatHeadlineShellTop(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-headline-shell-bottom", formatHeadlineShellBottom(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-chip", formatChipBackground(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-button", formatButtonBackground(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-config", formatConfigBackground(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-accent-top", formatAccentTopBackground(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-accent-bottom", formatAccentBottomBackground(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-violet-top", formatVioletTopBackground(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-violet-bottom", formatVioletBottomBackground(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-logo-frame-top", formatLogoFrameTop(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-logo-frame-bottom", formatLogoFrameBottom(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-logo-inner-center", formatLogoInnerCenter(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--bg-logo-inner-bottom", formatLogoInnerBottom(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--headline-accent-alpha", formatHeadlineAccent(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--headline-rail-alpha", formatHeadlineRail(initialPanelOpacity / 100));
    document.documentElement.style.setProperty("--headline-rail-tail-alpha", formatHeadlineRailTail(initialPanelOpacity / 100));
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--app-zoom", `${zoomPercent}%`);
    window.localStorage.setItem(APP_ZOOM_STORAGE_KEY, String(zoomPercent));
  }, [zoomPercent]);

  useEffect(() => {
    const alpha = panelOpacityPercent / 100;
    document.documentElement.style.setProperty("--bg-panel", formatPanelBackground(alpha));
    document.documentElement.style.setProperty("--bg-panel-strong", formatPanelStrongBackground(alpha));
    document.documentElement.style.setProperty("--bg-card", formatCardBackground(alpha));
    document.documentElement.style.setProperty("--bg-elevated-top", formatElevatedBackgroundTop(alpha));
    document.documentElement.style.setProperty("--bg-elevated-bottom", formatElevatedBackgroundBottom(alpha));
    document.documentElement.style.setProperty("--bg-header-top", formatHeaderBackgroundTop(alpha));
    document.documentElement.style.setProperty("--bg-header-bottom", formatHeaderBackgroundBottom(alpha));
    document.documentElement.style.setProperty("--bg-header-pill-top", formatHeaderPillTop(alpha));
    document.documentElement.style.setProperty("--bg-header-pill-bottom", formatHeaderPillBottom(alpha));
    document.documentElement.style.setProperty("--bg-headline-shell-top", formatHeadlineShellTop(alpha));
    document.documentElement.style.setProperty("--bg-headline-shell-bottom", formatHeadlineShellBottom(alpha));
    document.documentElement.style.setProperty("--bg-chip", formatChipBackground(alpha));
    document.documentElement.style.setProperty("--bg-button", formatButtonBackground(alpha));
    document.documentElement.style.setProperty("--bg-config", formatConfigBackground(alpha));
    document.documentElement.style.setProperty("--bg-accent-top", formatAccentTopBackground(alpha));
    document.documentElement.style.setProperty("--bg-accent-bottom", formatAccentBottomBackground(alpha));
    document.documentElement.style.setProperty("--bg-violet-top", formatVioletTopBackground(alpha));
    document.documentElement.style.setProperty("--bg-violet-bottom", formatVioletBottomBackground(alpha));
    document.documentElement.style.setProperty("--bg-logo-frame-top", formatLogoFrameTop(alpha));
    document.documentElement.style.setProperty("--bg-logo-frame-bottom", formatLogoFrameBottom(alpha));
    document.documentElement.style.setProperty("--bg-logo-inner-center", formatLogoInnerCenter(alpha));
    document.documentElement.style.setProperty("--bg-logo-inner-bottom", formatLogoInnerBottom(alpha));
    document.documentElement.style.setProperty("--headline-accent-alpha", formatHeadlineAccent(alpha));
    document.documentElement.style.setProperty("--headline-rail-alpha", formatHeadlineRail(alpha));
    document.documentElement.style.setProperty("--headline-rail-tail-alpha", formatHeadlineRailTail(alpha));
    window.localStorage.setItem(PANEL_OPACITY_STORAGE_KEY, String(panelOpacityPercent));
  }, [panelOpacityPercent]);

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
    panelOpacityPercent,
    setPanelOpacityPercent: (value: number) => setPanelOpacityPercent(clampPanelOpacity(value)),
  };
}
