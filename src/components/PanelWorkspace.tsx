import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, type Ref, type RefObject } from "react";
import type { DockEdge, DockNode, DockPlacement, PanelId } from "../lib/panels/panelLayout";

export type PanelWorkspaceDropPreview =
  | { kind: "workspace"; placement: DockPlacement }
  | { kind: "panel"; panelId: PanelId; placement: DockPlacement }
  | { kind: "empty"; emptyId: string };

interface PanelWorkspaceProps {
  dockRoot: DockNode | null;
  renderPanel: (panelId: PanelId) => ReactNode;
  onSplitResize?: (splitId: string, ratio: number, availableSize: number) => void;
  onSplitResizeEnd?: () => void;
  onPanelEdgeCreateEmpty?: (panelId: PanelId, edge: DockEdge, ratio: number, availableSize: number, shouldPersist?: boolean) => void;
  workspaceRef?: Ref<HTMLDivElement>;
  dropPreview?: PanelWorkspaceDropPreview | null;
}

interface DockTreeProps extends PanelWorkspaceProps {
  node: DockNode;
  resizeEdges?: Partial<Record<DockEdge, EdgeResizeTarget>>;
}

interface EdgeResizeTarget {
  direction: "row" | "column";
  splitId: string;
  splitRef: RefObject<HTMLDivElement | null>;
}

const SPLIT_KEYBOARD_STEP = 0.02;
const SPLIT_KEYBOARD_LARGE_STEP = 0.1;
const SPLIT_GAP_PX = 16;
const EDGE_DRAG_MIN_DISTANCE = 6;
const PANEL_EDGE_GRIPS: DockEdge[] = ["left", "right", "top", "bottom"];

function getNodeMinWidth(node: DockNode): number {
  if (node.type === "panel" || node.type === "empty") {
    return node.minWidth;
  }

  return node.direction === "row"
    ? getNodeMinWidth(node.first) + getNodeMinWidth(node.second)
    : Math.max(getNodeMinWidth(node.first), getNodeMinWidth(node.second));
}

function getNodeMinHeight(node: DockNode): number {
  if (node.type === "panel" || node.type === "empty") {
    return node.minHeight;
  }

  return node.direction === "column"
    ? getNodeMinHeight(node.first) + getNodeMinHeight(node.second)
    : Math.max(getNodeMinHeight(node.first), getNodeMinHeight(node.second));
}

function DockTree({ node, renderPanel, onSplitResize, onSplitResizeEnd, onPanelEdgeCreateEmpty, workspaceRef, dropPreview, resizeEdges }: DockTreeProps) {
  const splitRef = useRef<HTMLDivElement | null>(null);
  const firstPaneRef = useRef<HTMLDivElement | null>(null);
  const leafRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [measuredSplitOffset, setMeasuredSplitOffset] = useState<number | null>(null);
  const [activeEdge, setActiveEdge] = useState<DockEdge | null>(null);

  useLayoutEffect(() => {
    if (node.type !== "split") {
      setMeasuredSplitOffset(null);
      return;
    }

    const splitElement = splitRef.current;
    const firstPaneElement = firstPaneRef.current;

    if (!splitElement || !firstPaneElement) {
      return;
    }

    const updateMeasuredOffset = () => {
      const splitBounds = splitElement.getBoundingClientRect();
      const firstPaneBounds = firstPaneElement.getBoundingClientRect();
      const nextOffset =
        node.direction === "row"
          ? firstPaneBounds.right - splitBounds.left + SPLIT_GAP_PX / 2
          : firstPaneBounds.bottom - splitBounds.top + SPLIT_GAP_PX / 2;

      setMeasuredSplitOffset((currentOffset) => (Math.abs((currentOffset ?? 0) - nextOffset) > 0.5 ? nextOffset : currentOffset));
    };

    updateMeasuredOffset();

    const resizeObserver = new ResizeObserver(updateMeasuredOffset);
    resizeObserver.observe(splitElement);
    resizeObserver.observe(firstPaneElement);

    return () => resizeObserver.disconnect();
  }, [node]);

  if (node.type === "panel") {
    const isPreviewed = dropPreview?.kind === "panel" && dropPreview.panelId === node.panelId;
    const createEmptyFromPanelEdge = onPanelEdgeCreateEmpty;

    const handleEdgePointerDown = (edge: DockEdge, event: PointerEvent<HTMLButtonElement>) => {
      if (!createEmptyFromPanelEdge && !onSplitResize) {
        return;
      }

      const leafElement = leafRef.current;

      if (!leafElement) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      setActiveEdge(edge);

      const bounds = leafElement.getBoundingClientRect();
      const pointerId = event.pointerId;
      const startX = event.clientX;
      const startY = event.clientY;
      const availableSize = edge === "left" || edge === "right" ? bounds.width : bounds.height;
      const resizeTarget = resizeEdges?.[edge];
      let hasCommittedDrag = false;

      const cleanup = () => {
        window.removeEventListener("pointermove", handleWindowPointerMove);
        window.removeEventListener("pointerup", handleWindowPointerUp);
        window.removeEventListener("pointercancel", handleWindowPointerCancel);
        setActiveEdge(null);
      };

      const updatePanelEdgeDrag = (clientX: number, clientY: number, shouldPersist: boolean) => {
        const distance = Math.hypot(clientX - startX, clientY - startY);

        if (distance < EDGE_DRAG_MIN_DISTANCE) {
          return;
        }

        if (resizeTarget && onSplitResize) {
          const splitElement = resizeTarget.splitRef.current;

          if (!splitElement) {
            return;
          }

          const splitBounds = splitElement.getBoundingClientRect();
          const splitAvailableSize = resizeTarget.direction === "row" ? splitBounds.width : splitBounds.height;

          if (splitAvailableSize <= 0) {
            return;
          }

          const splitPointerOffset = resizeTarget.direction === "row" ? clientX - splitBounds.left : clientY - splitBounds.top;
          hasCommittedDrag = true;
          onSplitResize(resizeTarget.splitId, splitPointerOffset / splitAvailableSize, splitAvailableSize);
          return;
        }

        if (!createEmptyFromPanelEdge || availableSize <= 0) {
          return;
        }

        const pointerOffset = edge === "left" || edge === "right" ? clientX - bounds.left : clientY - bounds.top;
        const ratio = Math.min(1, Math.max(0, pointerOffset / availableSize));
        hasCommittedDrag = true;
        createEmptyFromPanelEdge(node.panelId, edge, ratio, availableSize, shouldPersist);
      };

      function handleWindowPointerMove(pointerEvent: globalThis.PointerEvent) {
        if (pointerEvent.pointerId !== pointerId) {
          return;
        }

        pointerEvent.preventDefault();
        updatePanelEdgeDrag(pointerEvent.clientX, pointerEvent.clientY, false);
      }

      function handleWindowPointerUp(pointerEvent: globalThis.PointerEvent) {
        if (pointerEvent.pointerId !== pointerId) {
          return;
        }

        pointerEvent.preventDefault();
        if (hasCommittedDrag) {
          updatePanelEdgeDrag(pointerEvent.clientX, pointerEvent.clientY, true);
          if (resizeTarget) {
            onSplitResizeEnd?.();
          }
        }
        cleanup();
      }

      function handleWindowPointerCancel(pointerEvent: globalThis.PointerEvent) {
        if (pointerEvent.pointerId === pointerId) {
          cleanup();
        }
      }

      window.addEventListener("pointermove", handleWindowPointerMove, { passive: false });
      window.addEventListener("pointerup", handleWindowPointerUp, { passive: false });
      window.addEventListener("pointercancel", handleWindowPointerCancel);
    };

    return (
      <div ref={leafRef} className="panel-workspace-leaf" data-panel-id={node.panelId} data-drop-placement={isPreviewed ? dropPreview.placement : undefined}>
        {renderPanel(node.panelId)}
        {isPreviewed ? <span className="panel-workspace-drop-preview" aria-hidden="true" /> : null}
        {createEmptyFromPanelEdge
          ? PANEL_EDGE_GRIPS.map((edge) => (
              <button
                key={edge}
                type="button"
                className={`panel-workspace-edge-grip panel-workspace-edge-grip-${edge}`}
                data-active={activeEdge === edge ? "true" : undefined}
                aria-label={`Create empty cell to the ${edge} of ${node.panelId} panel`}
                onPointerDown={(event) => handleEdgePointerDown(edge, event)}
              />
            ))
          : null}
      </div>
    );
  }

  if (node.type === "empty") {
    const isPreviewed = dropPreview?.kind === "empty" && dropPreview.emptyId === node.id;

    return (
      <div className="panel-workspace-empty" data-empty-cell-id={node.id} data-drop-active={isPreviewed ? "true" : undefined}>
        {isPreviewed ? <span className="panel-workspace-empty-drop-preview" aria-hidden="true" /> : null}
      </div>
    );
  }

  const firstSize = node.ratio;
  const secondSize = 1 - node.ratio;
  const firstMinWidth = getNodeMinWidth(node.first);
  const secondMinWidth = getNodeMinWidth(node.second);
  const firstMinHeight = getNodeMinHeight(node.first);
  const secondMinHeight = getNodeMinHeight(node.second);
  const splitAvailableSize = node.availableSize ? Math.max(0, node.availableSize - SPLIT_GAP_PX) : undefined;
  const firstTrackSize = splitAvailableSize ? Math.round(splitAvailableSize * firstSize) : undefined;
  const secondTrackSize = splitAvailableSize ? Math.round(splitAvailableSize * secondSize) : undefined;
  const splitOffset = measuredSplitOffset !== null ? `${measuredSplitOffset}px` : firstTrackSize ? `${firstTrackSize + SPLIT_GAP_PX / 2}px` : `${node.ratio * 100}%`;
  const splitStyle =
    node.direction === "row"
      ? {
          gridTemplateColumns:
            firstTrackSize !== undefined
              ? `minmax(${firstMinWidth}px, ${firstTrackSize}px) minmax(${secondMinWidth}px, 1fr)`
              : `minmax(${firstMinWidth}px, ${firstSize}fr) minmax(${secondMinWidth}px, ${secondSize}fr)`,
          "--panel-workspace-split-offset": splitOffset,
        }
      : {
          gridTemplateRows:
            firstTrackSize && secondTrackSize
              ? `minmax(${firstMinHeight}px, ${firstTrackSize}px) minmax(${secondMinHeight}px, ${secondTrackSize}px)`
              : `minmax(${firstMinHeight}px, max-content) minmax(${secondMinHeight}px, max-content)`,
          "--panel-workspace-split-offset": splitOffset,
        };

  const updateSplitRatio = (event: PointerEvent<HTMLElement>) => {
    if (!onSplitResize || activePointerIdRef.current !== event.pointerId) {
      return;
    }

    const splitElement = splitRef.current;

    if (!splitElement) {
      return;
    }

    const bounds = splitElement.getBoundingClientRect();
    const availableSize = node.direction === "row" ? bounds.width : bounds.height;

    if (availableSize <= 0) {
      return;
    }

    const pointerOffset = node.direction === "row" ? event.clientX - bounds.left : event.clientY - bounds.top;
    onSplitResize(node.id, pointerOffset / availableSize, availableSize);
  };

  const handleSplitPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    updateSplitRatio(event);
  };

  const handleSplitPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    updateSplitRatio(event);
  };

  const handleSplitPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    activePointerIdRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    onSplitResizeEnd?.();
  };

  const handleSplitKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!onSplitResize) {
      return;
    }

    const directionDelta =
      node.direction === "row"
        ? event.key === "ArrowLeft"
          ? -1
          : event.key === "ArrowRight"
            ? 1
            : 0
        : event.key === "ArrowUp"
          ? -1
          : event.key === "ArrowDown"
            ? 1
            : 0;

    if (directionDelta === 0) {
      return;
    }

    const splitElement = splitRef.current;

    if (!splitElement) {
      return;
    }

    const bounds = splitElement.getBoundingClientRect();
    const availableSize = node.direction === "row" ? bounds.width : bounds.height;

    if (availableSize <= 0) {
      return;
    }

    event.preventDefault();
    const step = event.shiftKey ? SPLIT_KEYBOARD_LARGE_STEP : SPLIT_KEYBOARD_STEP;
    onSplitResize(node.id, node.ratio + directionDelta * step, availableSize);
    window.requestAnimationFrame(() => onSplitResizeEnd?.());
  };

  return (
    <div ref={splitRef} className={`panel-workspace-split panel-workspace-split-${node.direction}`} style={splitStyle as CSSProperties}>
      <div ref={firstPaneRef} className="panel-workspace-split-pane">
        <DockTree
          node={node.first}
          dockRoot={null}
          renderPanel={renderPanel}
          onSplitResize={onSplitResize}
          onSplitResizeEnd={onSplitResizeEnd}
          onPanelEdgeCreateEmpty={onPanelEdgeCreateEmpty}
          workspaceRef={workspaceRef}
          dropPreview={dropPreview}
          resizeEdges={{
            ...(node.direction === "row" ? { right: { direction: node.direction, splitId: node.id, splitRef } } : { bottom: { direction: node.direction, splitId: node.id, splitRef } }),
          }}
        />
      </div>
      <div className="panel-workspace-split-pane">
        <DockTree
          node={node.second}
          dockRoot={null}
          renderPanel={renderPanel}
          onSplitResize={onSplitResize}
          onSplitResizeEnd={onSplitResizeEnd}
          onPanelEdgeCreateEmpty={onPanelEdgeCreateEmpty}
          workspaceRef={workspaceRef}
          dropPreview={dropPreview}
          resizeEdges={{
            ...(node.direction === "row" ? { left: { direction: node.direction, splitId: node.id, splitRef } } : { top: { direction: node.direction, splitId: node.id, splitRef } }),
          }}
        />
      </div>
      <button
        type="button"
        className={`panel-workspace-split-handle panel-workspace-split-handle-${node.direction}`}
        role="separator"
        aria-label={node.direction === "row" ? "Resize docked panels horizontally" : "Resize docked panels vertically"}
        aria-orientation={node.direction === "row" ? "vertical" : "horizontal"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(node.ratio * 100)}
        onPointerDown={handleSplitPointerDown}
        onPointerMove={handleSplitPointerMove}
        onPointerUp={handleSplitPointerUp}
        onPointerCancel={handleSplitPointerUp}
        onKeyDown={handleSplitKeyDown}
      />
    </div>
  );
}

export function PanelWorkspace({ dockRoot, renderPanel, onSplitResize, onSplitResizeEnd, onPanelEdgeCreateEmpty, workspaceRef, dropPreview }: PanelWorkspaceProps) {
  return (
    <div ref={workspaceRef} className="panel-workspace">
      {dropPreview?.kind === "workspace" ? <span className="panel-workspace-root-drop-preview" data-drop-placement={dropPreview.placement} aria-hidden="true" /> : null}
      {dockRoot ? (
        <DockTree
          node={dockRoot}
          dockRoot={dockRoot}
          renderPanel={renderPanel}
          onSplitResize={onSplitResize}
          onSplitResizeEnd={onSplitResizeEnd}
          onPanelEdgeCreateEmpty={onPanelEdgeCreateEmpty}
          dropPreview={dropPreview}
        />
      ) : (
        <div className="panel-workspace-empty" />
      )}
    </div>
  );
}
