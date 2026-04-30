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
  onPanelEdgeCreateEmpty?: (panelId: PanelId, edge: DockEdge, ratio: number, availableSize: number, shouldPersist?: boolean, parentLock?: EdgeCreateParentLock) => void;
  workspaceRef?: Ref<HTMLDivElement>;
  dropPreview?: PanelWorkspaceDropPreview | null;
  zoomScale?: number;
  hideEmptyCells?: boolean;
}

interface DockTreeProps extends PanelWorkspaceProps {
  node: DockNode;
  resizeEdges?: Partial<Record<DockEdge, EdgeResizeTarget>>;
  parentRowLockTarget?: EdgeCreateParentLockTarget;
}

interface EdgeResizeTarget {
  direction: "row" | "column";
  splitId: string;
  splitRef: RefObject<HTMLDivElement | null>;
}

interface EdgeCreatePreview {
  edge: DockEdge;
  ratio: number;
}

interface EdgeCreateParentLock {
  splitId: string;
  blockSize: number;
}

interface EdgeCreateParentLockTarget {
  splitId: string;
  splitRef: RefObject<HTMLDivElement | null>;
}

const SPLIT_KEYBOARD_STEP = 0.02;
const SPLIT_KEYBOARD_LARGE_STEP = 0.1;
const SPLIT_GAP_PX = 16;
const EDGE_DRAG_MIN_DISTANCE = 6;
const PANEL_EDGE_GRIPS: DockEdge[] = ["left", "right", "top", "bottom"];

type RectLike = Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">;

export function getSafeZoomScale(zoomScale?: number) {
  return zoomScale && Number.isFinite(zoomScale) && zoomScale > 0 ? zoomScale : 1;
}

export function toLayoutPx(value: number, zoomScale?: number) {
  return value / getSafeZoomScale(zoomScale);
}

export function getLayoutRectSize(bounds: RectLike, direction: "row" | "column", zoomScale?: number) {
  return toLayoutPx(direction === "row" ? bounds.width : bounds.height, zoomScale);
}

export function getLayoutPointerOffset(bounds: RectLike, direction: "row" | "column", clientX: number, clientY: number, zoomScale?: number) {
  const visualOffset = direction === "row" ? clientX - bounds.left : clientY - bounds.top;
  return toLayoutPx(visualOffset, zoomScale);
}

export function getCommittedTrackRatio(pointerOffset: number, availableSize: number, splitGap = SPLIT_GAP_PX) {
  const trackSize = Math.max(1, availableSize - splitGap);
  return Math.min(1, Math.max(0, pointerOffset / trackSize));
}

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

function getPanelEdgePreviewStyle(preview: EdgeCreatePreview): CSSProperties {
  const clampedRatio = Math.min(1, Math.max(0, preview.ratio));
  const leadingPercent = `${clampedRatio * 100}%`;
  const trailingPercent = `${(1 - clampedRatio) * 100}%`;

  switch (preview.edge) {
    case "left":
      return { right: trailingPercent };
    case "right":
      return { left: leadingPercent };
    case "top":
      return { bottom: trailingPercent };
    case "bottom":
      return { top: leadingPercent };
  }
}

function getPanelEdgePreviewPanelShare(preview: EdgeCreatePreview) {
  return preview.edge === "left" || preview.edge === "top" ? 1 - preview.ratio : preview.ratio;
}

function nodeContainsEmptyCell(node: DockNode): boolean {
  if (node.type === "empty") {
    return true;
  }

  if (node.type === "panel") {
    return false;
  }

  return nodeContainsEmptyCell(node.first) || nodeContainsEmptyCell(node.second);
}

function isBlockEdgeLockedSplit(node: DockNode): boolean {
  return (
    node.type === "split" &&
    node.direction === "column" &&
    node.availableSize !== undefined &&
    (node.edgeLockAxis === "block" || (node.id.startsWith("split-empty-") && node.edgeLockAxis === undefined))
  );
}

function isInlineEdgeLockedSplit(node: DockNode): boolean {
  return (
    node.type === "split" &&
    node.direction === "row" &&
    node.availableSize !== undefined &&
    (node.edgeLockAxis === "inline" || (node.id.startsWith("split-empty-") && node.edgeLockAxis === undefined))
  );
}

function nodeContainsEdgeLockedSplit(node: DockNode): boolean {
  if (isBlockEdgeLockedSplit(node) || isInlineEdgeLockedSplit(node)) {
    return true;
  }

  if (node.type !== "split") {
    return false;
  }

  return nodeContainsEdgeLockedSplit(node.first) || nodeContainsEdgeLockedSplit(node.second);
}

function DockTree({ node, renderPanel, onSplitResize, onSplitResizeEnd, onPanelEdgeCreateEmpty, workspaceRef, dropPreview, zoomScale, resizeEdges, parentRowLockTarget, hideEmptyCells }: DockTreeProps) {
  const splitRef = useRef<HTMLDivElement | null>(null);
  const firstPaneRef = useRef<HTMLDivElement | null>(null);
  const leafRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [measuredSplitOffset, setMeasuredSplitOffset] = useState<number | null>(null);
  const [activeEdge, setActiveEdge] = useState<DockEdge | null>(null);
  const [edgeCreatePreview, setEdgeCreatePreview] = useState<EdgeCreatePreview | null>(null);

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
          ? toLayoutPx(firstPaneBounds.right - splitBounds.left, zoomScale) + SPLIT_GAP_PX / 2
          : toLayoutPx(firstPaneBounds.bottom - splitBounds.top, zoomScale) + SPLIT_GAP_PX / 2;

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
    const panelId = node.panelId;

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
      const panelEdgeDirection = edge === "left" || edge === "right" ? "row" : "column";
      const availableSize = getLayoutRectSize(bounds, panelEdgeDirection, zoomScale);
      const resizeTarget = resizeEdges?.[edge];
      const parentLockTarget = edge === "top" || edge === "bottom" ? parentRowLockTarget : undefined;
      const parentLockElement = parentLockTarget?.splitRef.current;
      const parentLockBounds = parentLockElement?.getBoundingClientRect();
      const parentLock =
        parentLockTarget && parentLockBounds && parentLockBounds.height > 0
          ? {
              splitId: parentLockTarget.splitId,
              blockSize: getLayoutRectSize(parentLockBounds, "column", zoomScale),
            }
          : undefined;
      let hasCommittedDrag = false;

      const cleanup = () => {
        window.removeEventListener("pointermove", handleWindowPointerMove);
        window.removeEventListener("pointerup", handleWindowPointerUp);
        window.removeEventListener("pointercancel", handleWindowPointerCancel);
        setActiveEdge(null);
        setEdgeCreatePreview(null);
      };

      const getPanelEdgeRatio = (clientX: number, clientY: number) => {
        const pointerOffset = getLayoutPointerOffset(bounds, panelEdgeDirection, clientX, clientY, zoomScale);
        return Math.min(1, Math.max(0, pointerOffset / availableSize));
      };

      const getCommittedPanelEdgeRatio = (clientX: number, clientY: number) => {
        const pointerOffset = getLayoutPointerOffset(bounds, panelEdgeDirection, clientX, clientY, zoomScale);
        return getCommittedTrackRatio(pointerOffset, availableSize);
      };

      const updatePanelEdgeDrag = (clientX: number, clientY: number) => {
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
          const splitAvailableSize = getLayoutRectSize(splitBounds, resizeTarget.direction, zoomScale);

          if (splitAvailableSize <= 0) {
            return;
          }

          const splitPointerOffset = getLayoutPointerOffset(splitBounds, resizeTarget.direction, clientX, clientY, zoomScale);
          hasCommittedDrag = true;
          onSplitResize(resizeTarget.splitId, splitPointerOffset / splitAvailableSize, splitAvailableSize);
          return;
        }

        if (!createEmptyFromPanelEdge || availableSize <= 0) {
          return;
        }

        hasCommittedDrag = true;
        setEdgeCreatePreview({ edge, ratio: getPanelEdgeRatio(clientX, clientY) });
      };

      function handleWindowPointerMove(pointerEvent: globalThis.PointerEvent) {
        if (pointerEvent.pointerId !== pointerId) {
          return;
        }

        pointerEvent.preventDefault();
        updatePanelEdgeDrag(pointerEvent.clientX, pointerEvent.clientY);
      }

      function handleWindowPointerUp(pointerEvent: globalThis.PointerEvent) {
        if (pointerEvent.pointerId !== pointerId) {
          return;
        }

        pointerEvent.preventDefault();
        if (hasCommittedDrag) {
          if (resizeTarget) {
            updatePanelEdgeDrag(pointerEvent.clientX, pointerEvent.clientY);
            onSplitResizeEnd?.();
          } else if (createEmptyFromPanelEdge && availableSize > 0) {
            createEmptyFromPanelEdge(panelId, edge, getCommittedPanelEdgeRatio(pointerEvent.clientX, pointerEvent.clientY), availableSize, true, parentLock);
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

    const leafStyle = edgeCreatePreview
      ? ({
          "--panel-workspace-edge-preview-panel-share": `${Math.min(1, Math.max(0, getPanelEdgePreviewPanelShare(edgeCreatePreview))) * 100}%`,
        } as CSSProperties)
      : undefined;

    return (
      <div
        ref={leafRef}
        className="panel-workspace-leaf"
        data-panel-id={node.panelId}
        data-drop-placement={isPreviewed ? dropPreview.placement : undefined}
        data-edge-preview={edgeCreatePreview?.edge}
        style={leafStyle}
      >
        {renderPanel(node.panelId)}
        {isPreviewed ? <span className="panel-workspace-drop-preview" aria-hidden="true" /> : null}
        {edgeCreatePreview ? (
          <span
            className="panel-workspace-edge-create-preview"
            data-edge={edgeCreatePreview.edge}
            style={getPanelEdgePreviewStyle(edgeCreatePreview)}
            aria-hidden="true"
          />
        ) : null}
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
    const emptyCellClassName = `panel-workspace-empty${hideEmptyCells ? " panel-workspace-empty--hidden" : ""}`;

    return (
      <div className={emptyCellClassName} data-empty-cell-id={node.id} data-drop-active={isPreviewed ? "true" : undefined}>
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
  const rowTemplate =
    firstTrackSize !== undefined && (node.first.type === "empty" || isInlineEdgeLockedSplit(node))
      ? `${Math.max(firstMinWidth, firstTrackSize)}px minmax(${secondMinWidth}px, calc(100% - ${Math.max(firstMinWidth, firstTrackSize)}px - ${SPLIT_GAP_PX}px))`
      : secondTrackSize !== undefined && node.second.type === "empty"
        ? `minmax(${firstMinWidth}px, calc(100% - ${Math.max(secondMinWidth, secondTrackSize)}px - ${SPLIT_GAP_PX}px)) ${Math.max(secondMinWidth, secondTrackSize)}px`
        : `minmax(${firstMinWidth}px, ${firstSize}fr) minmax(${secondMinWidth}px, ${secondSize}fr)`;
  const columnTemplate =
    firstTrackSize !== undefined && (node.first.type === "empty" || isBlockEdgeLockedSplit(node))
      ? `${Math.max(firstMinHeight, firstTrackSize)}px minmax(${secondMinHeight}px, 1fr)`
      : secondTrackSize !== undefined && node.second.type === "empty"
        ? `${Math.max(firstMinHeight, firstTrackSize ?? 0)}px minmax(${secondMinHeight}px, 1fr)`
        : `minmax(${firstMinHeight}px, max-content) minmax(${secondMinHeight}px, max-content)`;
  const shouldLockVerticalEmptySplitHeight = isBlockEdgeLockedSplit(node) || (node.direction === "column" && node.availableSize !== undefined && (node.first.type === "empty" || node.second.type === "empty"));
  const shouldLockRowBlockSize = node.direction === "row" && node.lockedBlockSize !== undefined && (nodeContainsEmptyCell(node) || nodeContainsEdgeLockedSplit(node));
  const splitStyle =
    node.direction === "row"
      ? {
          gridTemplateColumns: rowTemplate,
          ...(shouldLockRowBlockSize
            ? {
                height: `${node.lockedBlockSize}px`,
                maxHeight: `${node.lockedBlockSize}px`,
                minHeight: 0,
              }
            : {}),
          "--panel-workspace-split-offset": splitOffset,
        }
      : {
          gridTemplateRows: columnTemplate,
          ...(shouldLockVerticalEmptySplitHeight
            ? {
                height: `${node.availableSize}px`,
                maxHeight: `${node.availableSize}px`,
                minHeight: 0,
              }
            : {}),
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
    const availableSize = getLayoutRectSize(bounds, node.direction, zoomScale);

    if (availableSize <= 0) {
      return;
    }

    const pointerOffset = getLayoutPointerOffset(bounds, node.direction, event.clientX, event.clientY, zoomScale);
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
    const availableSize = getLayoutRectSize(bounds, node.direction, zoomScale);

    if (availableSize <= 0) {
      return;
    }

    event.preventDefault();
    const step = event.shiftKey ? SPLIT_KEYBOARD_LARGE_STEP : SPLIT_KEYBOARD_STEP;
    onSplitResize(node.id, node.ratio + directionDelta * step, availableSize);
    window.requestAnimationFrame(() => onSplitResizeEnd?.());
  };

  const childParentRowLockTarget = node.direction === "row" ? { splitId: node.id, splitRef } : parentRowLockTarget;

  return (
    <div ref={splitRef} className={`panel-workspace-split panel-workspace-split-${node.direction}`} style={splitStyle as CSSProperties}>
      <div ref={firstPaneRef} className="panel-workspace-split-pane">
        <DockTree
          node={node.first}
          dockRoot={null}
          renderPanel={renderPanel}
          hideEmptyCells={hideEmptyCells}
          onSplitResize={onSplitResize}
          onSplitResizeEnd={onSplitResizeEnd}
          onPanelEdgeCreateEmpty={onPanelEdgeCreateEmpty}
          workspaceRef={workspaceRef}
          dropPreview={dropPreview}
          zoomScale={zoomScale}
          parentRowLockTarget={childParentRowLockTarget}
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
          hideEmptyCells={hideEmptyCells}
          onSplitResize={onSplitResize}
          onSplitResizeEnd={onSplitResizeEnd}
          onPanelEdgeCreateEmpty={onPanelEdgeCreateEmpty}
          workspaceRef={workspaceRef}
          dropPreview={dropPreview}
          zoomScale={zoomScale}
          parentRowLockTarget={childParentRowLockTarget}
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

export function PanelWorkspace({ dockRoot, renderPanel, onSplitResize, onSplitResizeEnd, onPanelEdgeCreateEmpty, workspaceRef, dropPreview, zoomScale, hideEmptyCells }: PanelWorkspaceProps) {
  const emptyCellClassName = `panel-workspace-empty${hideEmptyCells ? " panel-workspace-empty--hidden" : ""}`;

  return (
    <div ref={workspaceRef} className="panel-workspace">
      {dropPreview?.kind === "workspace" ? <span className="panel-workspace-root-drop-preview" data-drop-placement={dropPreview.placement} aria-hidden="true" /> : null}
      {dockRoot ? (
        <DockTree
          node={dockRoot}
          dockRoot={dockRoot}
          renderPanel={renderPanel}
          hideEmptyCells={hideEmptyCells}
          onSplitResize={onSplitResize}
          onSplitResizeEnd={onSplitResizeEnd}
          onPanelEdgeCreateEmpty={onPanelEdgeCreateEmpty}
          dropPreview={dropPreview}
          zoomScale={zoomScale}
        />
      ) : (
        <div className={emptyCellClassName} />
      )}
    </div>
  );
}
