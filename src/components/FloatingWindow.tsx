import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

interface FloatingWindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FloatingWindowProps {
  title: string;
  isOpen: boolean;
  initialRect: FloatingWindowRect;
  minWidth?: number;
  minHeight?: number;
  onClose: () => void;
  children: ReactNode;
}

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const VIEWPORT_PADDING = 12;
let floatingWindowZIndex = 90;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampRect(rect: FloatingWindowRect, minWidth: number, minHeight: number) {
  const maxWidth = Math.max(minWidth, window.innerWidth - VIEWPORT_PADDING * 2);
  const maxHeight = Math.max(minHeight, window.innerHeight - VIEWPORT_PADDING * 2);
  const width = clamp(rect.width, minWidth, maxWidth);
  const height = clamp(rect.height, minHeight, maxHeight);
  const x = clamp(rect.x, VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING));
  const y = clamp(rect.y, VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING));

  return { x, y, width, height };
}

export function FloatingWindow({ title, isOpen, initialRect, minWidth = 360, minHeight = 220, onClose, children }: FloatingWindowProps) {
  const [rect, setRect] = useState(() => clampRect(initialRect, minWidth, minHeight));
  const [zIndex, setZIndex] = useState(floatingWindowZIndex);
  const wasOpenRef = useRef(isOpen);
  const dragRef = useRef<{
    handle: "move" | ResizeHandle;
    pointerId: number;
    startX: number;
    startY: number;
    startRect: FloatingWindowRect;
  } | null>(null);

  useEffect(() => {
    const didJustOpen = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (!didJustOpen) {
      return;
    }

    setRect(clampRect(initialRect, minWidth, minHeight));
    floatingWindowZIndex += 1;
    setZIndex(floatingWindowZIndex);
  }, [initialRect, isOpen, minHeight, minWidth]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleResize = () => {
      setRect((current) => clampRect(current, minWidth, minHeight));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, minHeight, minWidth]);

  if (!isOpen) {
    return null;
  }

  const bringToFront = () => {
    floatingWindowZIndex += 1;
    setZIndex(floatingWindowZIndex);
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

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
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

    setRect(clampRect(nextRect, minWidth, minHeight));
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;

    if (drag?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const resizeHandles: ResizeHandle[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

  return (
    <section
      className="floating-window"
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
        className="floating-window-header"
        onPointerDown={(event) => handlePointerDown(event, "move")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <strong>{title}</strong>
        <button type="button" className="floating-window-close" onPointerDown={(event) => event.stopPropagation()} onClick={onClose}>
          Close
        </button>
      </header>

      <div className="floating-window-body">{children}</div>

      {resizeHandles.map((handle) => (
        <span
          key={handle}
          className={`floating-window-resize floating-window-resize-${handle}`}
          onPointerDown={(event) => handlePointerDown(event, handle)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      ))}
    </section>
  );
}
