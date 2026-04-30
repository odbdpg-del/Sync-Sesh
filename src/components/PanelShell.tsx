import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

export interface PanelShellRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PanelShellDragInfo {
  rect: PanelShellRect;
  pointerX: number;
  pointerY: number;
}

interface PanelShellProps {
  title: string;
  isOpen: boolean;
  initialRect: PanelShellRect;
  rect?: PanelShellRect;
  zIndex?: number;
  minWidth?: number;
  minHeight?: number;
  onClose: () => void;
  onRectChange?: (rect: PanelShellRect) => void;
  onInteractionEnd?: () => void;
  onFocusPanel?: () => void;
  onDragMove?: (info: PanelShellDragInfo) => void;
  onDragEnd?: (info: PanelShellDragInfo) => void;
  actions?: ReactNode;
  children: ReactNode;
}

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const VIEWPORT_PADDING = 12;
const KEYBOARD_MOVE_STEP = 10;
const KEYBOARD_LARGE_MOVE_STEP = 40;
let panelShellZIndex = 90;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampRect(rect: PanelShellRect, minWidth: number, minHeight: number) {
  const maxWidth = Math.max(minWidth, window.innerWidth - VIEWPORT_PADDING * 2);
  const maxHeight = Math.max(minHeight, window.innerHeight - VIEWPORT_PADDING * 2);
  const width = clamp(rect.width, minWidth, maxWidth);
  const height = clamp(rect.height, minHeight, maxHeight);
  const x = clamp(rect.x, VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING));
  const y = clamp(rect.y, VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING));

  return { x, y, width, height };
}

function areRectsEqual(first: PanelShellRect, second: PanelShellRect) {
  return first.x === second.x && first.y === second.y && first.width === second.width && first.height === second.height;
}

function getResizeHandleLabel(title: string, handle: ResizeHandle) {
  switch (handle) {
    case "n":
      return `Resize ${title} from top edge`;
    case "s":
      return `Resize ${title} from bottom edge`;
    case "e":
      return `Resize ${title} from right edge`;
    case "w":
      return `Resize ${title} from left edge`;
    case "ne":
      return `Resize ${title} from top right corner`;
    case "nw":
      return `Resize ${title} from top left corner`;
    case "se":
      return `Resize ${title} from bottom right corner`;
    case "sw":
      return `Resize ${title} from bottom left corner`;
  }
}

function getResizeHandleOrientation(handle: ResizeHandle) {
  return handle === "e" || handle === "w" ? "vertical" : "horizontal";
}

export function PanelShell({
  title,
  isOpen,
  initialRect,
  rect: controlledRect,
  zIndex: controlledZIndex,
  minWidth = 360,
  minHeight = 220,
  onClose,
  onRectChange,
  onInteractionEnd,
  onFocusPanel,
  onDragMove,
  onDragEnd,
  actions,
  children,
}: PanelShellProps) {
  const [uncontrolledRect, setUncontrolledRect] = useState(() => clampRect(initialRect, minWidth, minHeight));
  const [uncontrolledZIndex, setUncontrolledZIndex] = useState(panelShellZIndex);
  const wasOpenRef = useRef(isOpen);
  const dragRef = useRef<{
    handle: "move" | ResizeHandle;
    pointerId: number;
    startX: number;
    startY: number;
    startRect: PanelShellRect;
  } | null>(null);

  useEffect(() => {
    const didJustOpen = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (!didJustOpen) {
      return;
    }

    if (!controlledRect) {
      setUncontrolledRect(clampRect(initialRect, minWidth, minHeight));
    }

    if (controlledZIndex === undefined) {
      panelShellZIndex += 1;
      setUncontrolledZIndex(panelShellZIndex);
    } else {
      onFocusPanel?.();
    }
  }, [controlledRect, controlledZIndex, initialRect, isOpen, minHeight, minWidth, onFocusPanel]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleResize = () => {
      if (controlledRect) {
        const nextRect = clampRect(controlledRect, minWidth, minHeight);
        if (!areRectsEqual(nextRect, controlledRect)) {
          onRectChange?.(nextRect);
        }
        return;
      }

      setUncontrolledRect((current) => clampRect(current, minWidth, minHeight));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [controlledRect, isOpen, minHeight, minWidth, onRectChange]);

  if (!isOpen) {
    return null;
  }

  const rect = controlledRect ?? uncontrolledRect;
  const zIndex = controlledZIndex ?? uncontrolledZIndex;

  const bringToFront = () => {
    if (controlledZIndex !== undefined) {
      onFocusPanel?.();
      return;
    }

    panelShellZIndex += 1;
    setUncontrolledZIndex(panelShellZIndex);
  };

  const setNextRect = (nextRect: PanelShellRect) => {
    const clampedRect = clampRect(nextRect, minWidth, minHeight);

    if (controlledRect) {
      onRectChange?.(clampedRect);
      return clampedRect;
    }

    setUncontrolledRect(clampedRect);
    return clampedRect;
  };

  const getNextDragRect = (drag: NonNullable<typeof dragRef.current>, clientX: number, clientY: number) => {
    const deltaX = clientX - drag.startX;
    const deltaY = clientY - drag.startY;
    const nextRect = { ...drag.startRect };

    if (drag.handle === "move") {
      nextRect.x += deltaX;
      nextRect.y += deltaY;
    } else {
      if (drag.handle.includes("e")) {
        nextRect.width += deltaX;
      }

      if (drag.handle.includes("s")) {
        nextRect.height += deltaY;
      }

      if (drag.handle.includes("w")) {
        nextRect.x += deltaX;
        nextRect.width -= deltaX;
      }

      if (drag.handle.includes("n")) {
        nextRect.y += deltaY;
        nextRect.height -= deltaY;
      }
    }

    return nextRect;
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>, handle: "move" | ResizeHandle) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    bringToFront();
    dragRef.current = {
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRect: rect,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const nextRect = setNextRect(getNextDragRect(drag, event.clientX, event.clientY));

    if (drag.handle === "move") {
      onDragMove?.({ rect: nextRect, pointerX: event.clientX, pointerY: event.clientY });
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;

    if (drag?.pointerId === event.pointerId) {
      if (drag.handle === "move") {
        const nextRect = clampRect(getNextDragRect(drag, event.clientX, event.clientY), minWidth, minHeight);
        onDragEnd?.({ rect: nextRect, pointerX: event.clientX, pointerY: event.clientY });
      }

      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      onInteractionEnd?.();
    }
  };

  const handleHeaderKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const step = event.shiftKey ? KEYBOARD_LARGE_MOVE_STEP : KEYBOARD_MOVE_STEP;
    const nextRect = { ...rect };

    switch (event.key) {
      case "ArrowLeft":
        nextRect.x -= step;
        break;
      case "ArrowRight":
        nextRect.x += step;
        break;
      case "ArrowUp":
        nextRect.y -= step;
        break;
      case "ArrowDown":
        nextRect.y += step;
        break;
      default:
        return;
    }

    event.preventDefault();
    bringToFront();
    setNextRect(nextRect);
    onInteractionEnd?.();
  };

  const handleResizeHandleKeyDown = (event: KeyboardEvent<HTMLElement>, handle: ResizeHandle) => {
    const step = event.shiftKey ? KEYBOARD_LARGE_MOVE_STEP : KEYBOARD_MOVE_STEP;
    const nextRect = { ...rect };
    const horizontalDelta = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const verticalDelta = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;

    if (!horizontalDelta && !verticalDelta) {
      return;
    }

    let didResize = false;

    if (handle.includes("e")) {
      nextRect.width += horizontalDelta;
      didResize = didResize || horizontalDelta !== 0;
    }

    if (handle.includes("w")) {
      nextRect.x += horizontalDelta;
      nextRect.width -= horizontalDelta;
      didResize = didResize || horizontalDelta !== 0;
    }

    if (handle.includes("s")) {
      nextRect.height += verticalDelta;
      didResize = didResize || verticalDelta !== 0;
    }

    if (handle.includes("n")) {
      nextRect.y += verticalDelta;
      nextRect.height -= verticalDelta;
      didResize = didResize || verticalDelta !== 0;
    }

    if (!didResize) {
      return;
    }

    event.preventDefault();
    bringToFront();
    setNextRect(nextRect);
    onInteractionEnd?.();
  };

  const resizeHandles: ResizeHandle[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

  return (
    <section
      className="panel-shell panel-shell-floating floating-window"
      onPointerDown={bringToFront}
      style={
        {
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          zIndex,
        } as CSSProperties
      }
    >
      <header
        className="panel-shell-header floating-window-header"
        tabIndex={0}
        aria-label={`Move ${title} floating panel`}
        onPointerDown={(event) => handlePointerDown(event, "move")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleHeaderKeyDown}
      >
        <strong>{title}</strong>
        <div className="panel-shell-actions floating-window-actions" onPointerDown={(event) => event.stopPropagation()}>
          {actions}
          <button type="button" className="panel-shell-close floating-window-close" aria-label={`Close ${title}`} onClick={onClose}>
            Close
          </button>
        </div>
      </header>

      <div className="panel-shell-body floating-window-body">{children}</div>

      {resizeHandles.map((handle) => (
        <span
          key={handle}
          className={`panel-shell-resize panel-shell-resize-${handle} floating-window-resize floating-window-resize-${handle}`}
          role="separator"
          tabIndex={0}
          aria-label={getResizeHandleLabel(title, handle)}
          aria-orientation={getResizeHandleOrientation(handle)}
          onPointerDown={(event) => handlePointerDown(event, handle)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={(event) => handleResizeHandleKeyDown(event, handle)}
        />
      ))}
    </section>
  );
}
