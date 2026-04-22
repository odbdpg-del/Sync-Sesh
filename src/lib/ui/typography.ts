export const FONT_STACK_UI = "\"Space Grotesk\", \"Segoe UI\", sans-serif";
export const FONT_STACK_DISPLAY = "\"Oxanium\", \"Space Grotesk\", sans-serif";
export const FONT_STACK_MONO = "\"IBM Plex Mono\", \"Consolas\", \"Courier New\", monospace";

type CanvasFontRole = "ui" | "display" | "mono";

const CANVAS_FONT_FAMILIES: Record<CanvasFontRole, string> = {
  ui: FONT_STACK_UI,
  display: FONT_STACK_DISPLAY,
  mono: FONT_STACK_MONO,
};

export function getCanvasFont(role: CanvasFontRole, weight: number, sizePx: number, options?: { italic?: boolean }) {
  const italicPrefix = options?.italic ? "italic " : "";
  return `${italicPrefix}${weight} ${sizePx}px ${CANVAS_FONT_FAMILIES[role]}`;
}
