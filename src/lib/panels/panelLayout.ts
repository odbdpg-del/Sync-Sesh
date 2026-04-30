export const PANEL_LAYOUT_VERSION = 1;
export const PANEL_LAYOUT_STORAGE_KEY = "syncsesh.panel-layout.v1";
export const DEFAULT_PANEL_MIN_SIZE = {
  minWidth: 1,
  minHeight: 1,
} as const;
export const DEFAULT_DOCK_EMPTY_MIN_SIZE = {
  minWidth: 1,
  minHeight: 1,
} as const;

export const PANEL_IDS = [
  "lobby",
  "timer",
  "globe",
  "soundcloud-radio",
  "soundcloud-widget",
  "soundcloud-decks",
  "admin",
  "debug-console",
] as const;

export type PanelId = (typeof PANEL_IDS)[number];

export interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PanelMinSize {
  minWidth: number;
  minHeight: number;
}

export interface PanelLayoutState {
  version: typeof PANEL_LAYOUT_VERSION;
  dockRoot: DockNode | null;
  floating: FloatingPanelState[];
  collapsed: PanelId[];
  activePanelId?: PanelId;
}

export type DockNode = DockSplitNode | DockPanelNode | DockEmptyNode;

export interface DockSplitNode {
  type: "split";
  id: string;
  direction: "row" | "column";
  ratio: number;
  availableSize?: number;
  first: DockNode;
  second: DockNode;
}

export interface DockPanelNode extends PanelMinSize {
  type: "panel";
  id: string;
  panelId: PanelId;
}

export interface DockEmptyNode extends PanelMinSize {
  type: "empty";
  id: string;
}

export interface FloatingPanelState {
  panelId: PanelId;
  rect: PanelRect;
  zIndex: number;
}

export type DockPlacement = "left" | "right" | "top" | "bottom";
export type DockEdge = "left" | "right" | "top" | "bottom";

export type PanelLayoutAction =
  | { type: "focus-floating-panel"; panelId: PanelId }
  | { type: "update-floating-rect"; panelId: PanelId; rect: PanelRect }
  | { type: "update-split-ratio"; splitId: string; ratio: number; availableSize?: number }
  | {
      type: "dock-panel";
      panelId: PanelId;
      /**
       * When omitted, the panel docks against the workspace root instead of a specific panel leaf.
       */
      targetPanelId?: PanelId;
      placement?: DockPlacement;
    }
  | { type: "undock-panel"; panelId: PanelId; rect?: PanelRect }
  | { type: "float-docked-panel-preserve-cell"; panelId: PanelId; rect?: PanelRect; emptyCellId?: string }
  | { type: "dock-panel-in-empty-cell"; panelId: PanelId; emptyCellId: string }
  | { type: "create-empty-cell-from-panel-edge"; panelId: PanelId; edge: DockEdge; ratio?: number; availableSize?: number; emptyCellId?: string }
  | { type: "remove-docked-panel"; panelId: PanelId }
  | { type: "reset-layout" };

const PANEL_ID_SET = new Set<string>(PANEL_IDS);
const DEFAULT_SPLIT_AVAILABLE_SIZE = {
  row: 1240,
  column: 800,
} as const;
const EDGE_EMPTY_COLLAPSE_PX = 15;
const RESIZED_EMPTY_CELL_COLLAPSE_PX = 15;

const DEFAULT_FLOATING_RECT: PanelRect = {
  x: 96,
  y: 96,
  width: 560,
  height: 420,
};

const PANEL_MIN_SIZES: Record<PanelId, PanelMinSize> = {
  lobby: { minWidth: 1, minHeight: 1 },
  timer: { minWidth: 1, minHeight: 1 },
  globe: { minWidth: 1, minHeight: 1 },
  "soundcloud-radio": { minWidth: 1, minHeight: 1 },
  "soundcloud-widget": { minWidth: 1, minHeight: 1 },
  "soundcloud-decks": { minWidth: 1, minHeight: 1 },
  admin: { minWidth: 1, minHeight: 1 },
  "debug-console": { minWidth: 1, minHeight: 1 },
};

function isPanelId(value: unknown): value is PanelId {
  return typeof value === "string" && PANEL_ID_SET.has(value);
}

function createDockPanelNode(panelId: PanelId): DockPanelNode {
  const minSize = PANEL_MIN_SIZES[panelId] ?? DEFAULT_PANEL_MIN_SIZE;

  return {
    type: "panel",
    id: `panel-${panelId}`,
    panelId,
    minWidth: minSize.minWidth,
    minHeight: minSize.minHeight,
  };
}

function normalizeEmptyCellId(id: string) {
  return id.startsWith("empty-") ? id : `empty-${id}`;
}

export function createDockEmptyNode(id: string, minSize: PanelMinSize = DEFAULT_DOCK_EMPTY_MIN_SIZE): DockEmptyNode {
  return {
    type: "empty",
    id: normalizeEmptyCellId(id),
    minWidth: minSize.minWidth,
    minHeight: minSize.minHeight,
  };
}

export function createDefaultPanelLayout(): PanelLayoutState {
  return {
    version: PANEL_LAYOUT_VERSION,
    dockRoot: {
      type: "split",
      id: "split-core-lobby-timer",
      direction: "row",
      ratio: 0.42,
      first: createDockPanelNode("lobby"),
      second: createDockPanelNode("timer"),
    },
    floating: [],
    collapsed: [],
    activePanelId: "timer",
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getMaxFloatingZIndex(floating: FloatingPanelState[]) {
  return floating.reduce((max, panel) => Math.max(max, panel.zIndex), 90);
}

function getMinWidth(node: DockNode): number {
  if (node.type === "panel" || node.type === "empty") {
    return node.minWidth;
  }

  return node.direction === "row"
    ? getMinWidth(node.first) + getMinWidth(node.second)
    : Math.max(getMinWidth(node.first), getMinWidth(node.second));
}

function getMinHeight(node: DockNode): number {
  if (node.type === "panel" || node.type === "empty") {
    return node.minHeight;
  }

  return node.direction === "column"
    ? getMinHeight(node.first) + getMinHeight(node.second)
    : Math.max(getMinHeight(node.first), getMinHeight(node.second));
}

function clampSplitRatio(split: DockSplitNode, ratio: number, availableSize?: number) {
  const firstMin = split.direction === "row" ? getMinWidth(split.first) : getMinHeight(split.first);
  const secondMin = split.direction === "row" ? getMinWidth(split.second) : getMinHeight(split.second);
  const size = availableSize ?? DEFAULT_SPLIT_AVAILABLE_SIZE[split.direction];

  if (size <= 0 || firstMin + secondMin >= size) {
    return firstMin / Math.max(firstMin + secondMin, 1);
  }

  return clamp(ratio, firstMin / size, 1 - secondMin / size);
}

function getCollapsedResizeSplitNode(split: DockSplitNode, ratio: number, availableSize?: number): DockNode | null {
  if (!availableSize || availableSize <= 0) {
    return null;
  }

  if (split.first.type === "empty" && ratio * availableSize <= RESIZED_EMPTY_CELL_COLLAPSE_PX) {
    return split.second;
  }

  if (split.second.type === "empty" && (1 - ratio) * availableSize <= RESIZED_EMPTY_CELL_COLLAPSE_PX) {
    return split.first;
  }

  return null;
}

function updateSplitRatio(node: DockNode, splitId: string, ratio: number, availableSize?: number): DockNode {
  if (node.type !== "split") {
    return node;
  }

  if (node.id === splitId) {
    const clampedRatio = clampSplitRatio(node, ratio, availableSize);
    const collapsedNode = getCollapsedResizeSplitNode(node, clampedRatio, availableSize);

    if (collapsedNode) {
      return collapsedNode;
    }

    return {
      ...node,
      ratio: clampedRatio,
      availableSize,
    };
  }

  return {
    ...node,
    first: updateSplitRatio(node.first, splitId, ratio, availableSize),
    second: updateSplitRatio(node.second, splitId, ratio, availableSize),
  };
}

function removeDockedPanel(node: DockNode | null, panelId: PanelId): { node: DockNode | null; removed: boolean } {
  if (!node) {
    return { node: null, removed: false };
  }

  if (node.type === "panel") {
    return node.panelId === panelId ? { node: null, removed: true } : { node, removed: false };
  }

  if (node.type === "empty") {
    return { node, removed: false };
  }

  const firstResult = removeDockedPanel(node.first, panelId);

  if (firstResult.removed) {
    if (!firstResult.node) {
      return { node: node.second, removed: true };
    }

    return {
      node: {
        ...node,
        first: firstResult.node,
      },
      removed: true,
    };
  }

  const secondResult = removeDockedPanel(node.second, panelId);

  if (!secondResult.removed) {
    return { node, removed: false };
  }

  if (!secondResult.node) {
    return { node: node.first, removed: true };
  }

  return {
    node: {
      ...node,
      second: secondResult.node,
    },
    removed: true,
  };
}

function replaceDockedPanelWithEmpty(node: DockNode | null, panelId: PanelId, emptyCellId: string): { node: DockNode | null; replaced: boolean } {
  if (!node) {
    return { node: null, replaced: false };
  }

  if (node.type === "panel") {
    if (node.panelId !== panelId) {
      return { node, replaced: false };
    }

    return {
      node: createDockEmptyNode(emptyCellId),
      replaced: true,
    };
  }

  if (node.type === "empty") {
    return { node, replaced: false };
  }

  const firstResult = replaceDockedPanelWithEmpty(node.first, panelId, emptyCellId);

  if (firstResult.replaced) {
    return {
      node: {
        ...node,
        first: firstResult.node ?? createDockEmptyNode(emptyCellId),
      },
      replaced: true,
    };
  }

  const secondResult = replaceDockedPanelWithEmpty(node.second, panelId, emptyCellId);

  if (!secondResult.replaced) {
    return { node, replaced: false };
  }

  return {
    node: {
      ...node,
      second: secondResult.node ?? createDockEmptyNode(emptyCellId),
    },
    replaced: true,
  };
}

function replaceEmptyCellWithPanel(node: DockNode | null, emptyCellId: string, panel: DockPanelNode): { node: DockNode | null; replaced: boolean } {
  if (!node) {
    return { node: null, replaced: false };
  }

  if (node.type === "empty") {
    return node.id === emptyCellId ? { node: panel, replaced: true } : { node, replaced: false };
  }

  if (node.type === "panel") {
    return { node, replaced: false };
  }

  const firstResult = replaceEmptyCellWithPanel(node.first, emptyCellId, panel);

  if (firstResult.replaced) {
    return {
      node: {
        ...node,
        first: firstResult.node ?? node.first,
      },
      replaced: true,
    };
  }

  const secondResult = replaceEmptyCellWithPanel(node.second, emptyCellId, panel);

  if (!secondResult.replaced) {
    return { node, replaced: false };
  }

  return {
    node: {
      ...node,
      second: secondResult.node ?? node.second,
    },
    replaced: true,
  };
}

function getEdgeSplitDetails(edge: DockEdge) {
  const isHorizontal = edge === "left" || edge === "right";
  const panelIsFirst = edge === "right" || edge === "bottom";

  return {
    direction: isHorizontal ? "row" : "column",
    panelIsFirst,
  } as const;
}

function splitHasPanelAndEmptyOnEdge(node: DockSplitNode, panelId: PanelId, edge: DockEdge) {
  const { direction, panelIsFirst } = getEdgeSplitDetails(edge);
  const panelNode = panelIsFirst ? node.first : node.second;
  const emptyNode = panelIsFirst ? node.second : node.first;

  return node.direction === direction && panelNode.type === "panel" && panelNode.panelId === panelId && emptyNode.type === "empty";
}

function splitHasPanelOnEdge(node: DockSplitNode, panelId: PanelId, edge: DockEdge) {
  const { direction, panelIsFirst } = getEdgeSplitDetails(edge);
  const panelNode = panelIsFirst ? node.first : node.second;

  return node.direction === direction && panelNode.type === "panel" && panelNode.panelId === panelId;
}

function shouldCollapseEmptyEdgeSplit(edge: DockEdge, ratio: number, availableSize?: number) {
  const { panelIsFirst } = getEdgeSplitDetails(edge);
  const emptyShare = panelIsFirst ? 1 - ratio : ratio;

  return availableSize && availableSize > 0 ? emptyShare * availableSize <= EDGE_EMPTY_COLLAPSE_PX : false;
}

function getSplitResizeFromPanelEdge(node: DockSplitNode, edge: DockEdge, panelLocalRatio: number, panelAvailableSize?: number) {
  const { panelIsFirst } = getEdgeSplitDetails(edge);
  const siblingShare = panelIsFirst ? node.ratio : 1 - node.ratio;

  return {
    ratio: panelIsFirst ? node.ratio * panelLocalRatio : node.ratio + (1 - node.ratio) * panelLocalRatio,
    availableSize: panelAvailableSize && siblingShare > 0 ? panelAvailableSize / siblingShare : panelAvailableSize,
  };
}

function createEdgeSplit(panel: DockPanelNode, edge: DockEdge, ratio: number, availableSize?: number, emptyCellId?: string): DockSplitNode {
  const { direction, panelIsFirst } = getEdgeSplitDetails(edge);
  const emptyNode = createDockEmptyNode(emptyCellId ?? `${panel.panelId}-${edge}-slot`);
  const split: DockSplitNode = {
    type: "split",
    id: `split-empty-${panel.panelId}-${edge}`,
    direction,
    ratio,
    first: panelIsFirst ? panel : emptyNode,
    second: panelIsFirst ? emptyNode : panel,
  };

  return {
    ...split,
    ratio: clampSplitRatio(split, ratio, availableSize),
  };
}

function createEmptyCellFromPanelEdge(
  node: DockNode | null,
  panelId: PanelId,
  edge: DockEdge,
  ratio: number,
  availableSize?: number,
  emptyCellId?: string,
): { node: DockNode | null; created: boolean } {
  if (!node) {
    return { node: null, created: false };
  }

  if (node.type === "panel") {
    if (node.panelId !== panelId) {
      return { node, created: false };
    }

    return {
      node: createEdgeSplit(node, edge, ratio, availableSize, emptyCellId),
      created: true,
    };
  }

  if (node.type === "empty") {
    return { node, created: false };
  }

  if (splitHasPanelAndEmptyOnEdge(node, panelId, edge) && shouldCollapseEmptyEdgeSplit(edge, ratio, availableSize)) {
    const { panelIsFirst } = getEdgeSplitDetails(edge);
    const panelNode = panelIsFirst ? node.first : node.second;

    return {
      node: panelNode,
      created: true,
    };
  }

  if (splitHasPanelAndEmptyOnEdge(node, panelId, edge)) {
    return {
      node: {
        ...node,
        ratio: clampSplitRatio(node, ratio, availableSize),
        availableSize: undefined,
      },
      created: true,
    };
  }

  if (splitHasPanelOnEdge(node, panelId, edge)) {
    const nextSplit = getSplitResizeFromPanelEdge(node, edge, ratio, availableSize);

    return {
      node: {
        ...node,
        ratio: clampSplitRatio(node, nextSplit.ratio, nextSplit.availableSize),
        availableSize: nextSplit.availableSize,
      },
      created: true,
    };
  }

  const firstResult = createEmptyCellFromPanelEdge(node.first, panelId, edge, ratio, availableSize, emptyCellId);

  if (firstResult.created) {
    return {
      node: {
        ...node,
        first: firstResult.node ?? node.first,
      },
      created: true,
    };
  }

  const secondResult = createEmptyCellFromPanelEdge(node.second, panelId, edge, ratio, availableSize, emptyCellId);

  if (!secondResult.created) {
    return { node, created: false };
  }

  return {
    node: {
      ...node,
      second: secondResult.node ?? node.second,
    },
    created: true,
  };
}

function wrapDockTarget(target: DockNode, newPanel: DockPanelNode, placement: DockPlacement): DockSplitNode {
  const placesFirst = placement === "left" || placement === "top";
  const direction = placement === "left" || placement === "right" ? "row" : "column";

  return {
    type: "split",
    id: `split-${newPanel.panelId}-${target.id}-${direction}`,
    direction,
    ratio: 0.5,
    first: placesFirst ? newPanel : target,
    second: placesFirst ? target : newPanel,
  };
}

function insertDockPanel(node: DockNode, targetPanelId: PanelId, newPanel: DockPanelNode, placement: DockPlacement): { node: DockNode; inserted: boolean } {
  if (node.type === "empty") {
    return { node, inserted: false };
  }

  if (node.type === "panel") {
    if (node.panelId !== targetPanelId) {
      return { node, inserted: false };
    }

    return {
      node: wrapDockTarget(node, newPanel, placement),
      inserted: true,
    };
  }

  const firstResult = insertDockPanel(node.first, targetPanelId, newPanel, placement);

  if (firstResult.inserted) {
    return {
      node: {
        ...node,
        first: firstResult.node,
      },
      inserted: true,
    };
  }

  const secondResult = insertDockPanel(node.second, targetPanelId, newPanel, placement);

  return {
    node: {
      ...node,
      second: secondResult.node,
    },
    inserted: secondResult.inserted,
  };
}

function addUniquePanelId(panelIds: PanelId[], panelId: PanelId) {
  return panelIds.includes(panelId) ? panelIds : [...panelIds, panelId];
}

function removePanelId(panelIds: PanelId[], panelId: PanelId) {
  return panelIds.filter((current) => current !== panelId);
}

function addOrUpdateFloatingPanel(floating: FloatingPanelState[], panelId: PanelId, rect: PanelRect) {
  const existing = floating.find((panel) => panel.panelId === panelId);

  if (existing) {
    return floating.map((panel) => (panel.panelId === panelId ? { ...panel, rect } : panel));
  }

  return [
    ...floating,
    {
      panelId,
      rect,
      zIndex: getMaxFloatingZIndex(floating) + 1,
    },
  ];
}

export function panelLayoutReducer(state: PanelLayoutState, action: PanelLayoutAction): PanelLayoutState {
  switch (action.type) {
    case "focus-floating-panel": {
      if (!state.floating.some((panel) => panel.panelId === action.panelId)) {
        return state;
      }

      const zIndex = getMaxFloatingZIndex(state.floating) + 1;

      return {
        ...state,
        activePanelId: action.panelId,
        floating: state.floating.map((panel) => (panel.panelId === action.panelId ? { ...panel, zIndex } : panel)),
      };
    }

    case "update-floating-rect":
      return {
        ...state,
        activePanelId: action.panelId,
        floating: addOrUpdateFloatingPanel(state.floating, action.panelId, action.rect),
      };

    case "update-split-ratio":
      return {
        ...state,
        dockRoot: state.dockRoot ? updateSplitRatio(state.dockRoot, action.splitId, action.ratio, action.availableSize) : null,
      };

    case "dock-panel": {
      const placement = action.placement ?? "right";
      const newPanel = createDockPanelNode(action.panelId);
      const withoutExisting = removeDockedPanel(state.dockRoot, action.panelId);
      let dockRoot: DockNode | null = withoutExisting.node;

      if (!dockRoot) {
        dockRoot = newPanel;
      } else if (action.targetPanelId) {
        const result = insertDockPanel(dockRoot, action.targetPanelId, newPanel, placement);
        dockRoot = result.inserted ? result.node : wrapDockTarget(dockRoot, newPanel, placement);
      } else {
        dockRoot = wrapDockTarget(dockRoot, newPanel, placement);
      }

      return {
        ...state,
        activePanelId: action.panelId,
        dockRoot,
        floating: state.floating.filter((panel) => panel.panelId !== action.panelId),
        collapsed: removePanelId(state.collapsed, action.panelId),
      };
    }

    case "undock-panel": {
      const result = removeDockedPanel(state.dockRoot, action.panelId);

      if (!result.removed) {
        return state;
      }

      return {
        ...state,
        activePanelId: action.panelId,
        dockRoot: result.node,
        floating: addOrUpdateFloatingPanel(state.floating, action.panelId, action.rect ?? DEFAULT_FLOATING_RECT),
        collapsed: removePanelId(state.collapsed, action.panelId),
      };
    }

    case "float-docked-panel-preserve-cell": {
      const result = replaceDockedPanelWithEmpty(state.dockRoot, action.panelId, action.emptyCellId ?? `${action.panelId}-slot`);

      if (!result.replaced) {
        return state;
      }

      return {
        ...state,
        activePanelId: action.panelId,
        dockRoot: result.node,
        floating: addOrUpdateFloatingPanel(state.floating, action.panelId, action.rect ?? DEFAULT_FLOATING_RECT),
        collapsed: removePanelId(state.collapsed, action.panelId),
      };
    }

    case "dock-panel-in-empty-cell": {
      const withoutExisting = removeDockedPanel(state.dockRoot, action.panelId);
      const replacementResult = replaceEmptyCellWithPanel(withoutExisting.node, normalizeEmptyCellId(action.emptyCellId), createDockPanelNode(action.panelId));

      if (!replacementResult.replaced) {
        return state;
      }

      return {
        ...state,
        activePanelId: action.panelId,
        dockRoot: replacementResult.node,
        floating: state.floating.filter((panel) => panel.panelId !== action.panelId),
        collapsed: removePanelId(state.collapsed, action.panelId),
      };
    }

    case "create-empty-cell-from-panel-edge": {
      const result = createEmptyCellFromPanelEdge(state.dockRoot, action.panelId, action.edge, action.ratio ?? 0.5, action.availableSize, action.emptyCellId);

      if (!result.created) {
        return state;
      }

      return {
        ...state,
        activePanelId: action.panelId,
        dockRoot: result.node,
      };
    }

    case "remove-docked-panel": {
      const result = removeDockedPanel(state.dockRoot, action.panelId);

      if (!result.removed) {
        return state;
      }

      return {
        ...state,
        dockRoot: result.node,
        collapsed: addUniquePanelId(state.collapsed, action.panelId),
        activePanelId: state.activePanelId === action.panelId ? undefined : state.activePanelId,
      };
    }

    case "reset-layout":
      return createDefaultPanelLayout();
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidRect(value: unknown): value is PanelRect {
  return (
    isPlainObject(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.height) &&
    value.width > 0 &&
    value.height > 0
  );
}

function validateDockNode(value: unknown, panelIds: Set<PanelId>): value is DockNode {
  if (!isPlainObject(value) || typeof value.id !== "string" || value.id.length === 0) {
    return false;
  }

  if (value.type === "panel") {
    if (!isPanelId(value.panelId) || !isFiniteNumber(value.minWidth) || !isFiniteNumber(value.minHeight) || value.minWidth <= 0 || value.minHeight <= 0) {
      return false;
    }

    if (panelIds.has(value.panelId)) {
      return false;
    }

    panelIds.add(value.panelId);
    return true;
  }

  if (value.type === "empty") {
    return (
      !Object.prototype.hasOwnProperty.call(value, "panelId") &&
      value.id.startsWith("empty-") &&
      isFiniteNumber(value.minWidth) &&
      isFiniteNumber(value.minHeight) &&
      value.minWidth > 0 &&
      value.minHeight > 0
    );
  }

  if (value.type !== "split") {
    return false;
  }

  if ((value.direction !== "row" && value.direction !== "column") || !isFiniteNumber(value.ratio) || value.ratio <= 0 || value.ratio >= 1) {
    return false;
  }

  if (value.availableSize !== undefined && (!isFiniteNumber(value.availableSize) || value.availableSize <= 0)) {
    return false;
  }

  return validateDockNode(value.first, panelIds) && validateDockNode(value.second, panelIds);
}

function hasDuplicatePanelId(panelIds: PanelId[]) {
  return new Set(panelIds).size !== panelIds.length;
}

export function validatePanelLayout(value: unknown): PanelLayoutState | null {
  if (!isPlainObject(value) || value.version !== PANEL_LAYOUT_VERSION) {
    return null;
  }

  if (!Object.prototype.hasOwnProperty.call(value, "dockRoot") || value.dockRoot === undefined) {
    return null;
  }

  if (value.dockRoot !== null && !isPlainObject(value.dockRoot)) {
    return null;
  }

  if (!Array.isArray(value.floating) || !Array.isArray(value.collapsed)) {
    return null;
  }

  if (value.activePanelId !== undefined && !isPanelId(value.activePanelId)) {
    return null;
  }

  const dockedPanelIds = new Set<PanelId>();

  if (value.dockRoot && !validateDockNode(value.dockRoot, dockedPanelIds)) {
    return null;
  }

  const floatingPanelIds: PanelId[] = [];

  for (const floatingPanel of value.floating) {
    if (
      !isPlainObject(floatingPanel) ||
      !isPanelId(floatingPanel.panelId) ||
      !isValidRect(floatingPanel.rect) ||
      !isFiniteNumber(floatingPanel.zIndex) ||
      dockedPanelIds.has(floatingPanel.panelId)
    ) {
      return null;
    }

    floatingPanelIds.push(floatingPanel.panelId);
  }

  if (hasDuplicatePanelId(floatingPanelIds)) {
    return null;
  }

  const collapsedPanelIds: PanelId[] = [];

  for (const panelId of value.collapsed) {
    if (!isPanelId(panelId)) {
      return null;
    }

    collapsedPanelIds.push(panelId);
  }

  if (hasDuplicatePanelId(collapsedPanelIds)) {
    return null;
  }

  return value as unknown as PanelLayoutState;
}

export function serializePanelLayout(state: PanelLayoutState) {
  return JSON.stringify(state);
}

export function parsePanelLayout(serialized: string) {
  try {
    return validatePanelLayout(JSON.parse(serialized));
  } catch {
    return null;
  }
}
