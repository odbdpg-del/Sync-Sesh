import assert from "node:assert/strict";
import test from "node:test";
import {
  PANEL_LAYOUT_STORAGE_KEY,
  PANEL_LAYOUT_VERSION,
  createDockEmptyNode,
  createDefaultPanelLayout,
  panelLayoutReducer,
  parsePanelLayout,
  serializePanelLayout,
  validatePanelLayout,
  type PanelLayoutState,
} from "../src/lib/panels/panelLayout";

test("default layout docks Lobby and Timer in the core row split", () => {
  const layout = createDefaultPanelLayout();

  assert.equal(PANEL_LAYOUT_STORAGE_KEY, "syncsesh.panel-layout.v1");
  assert.equal(layout.version, PANEL_LAYOUT_VERSION);
  assert.equal(layout.dockRoot?.type, "split");

  if (layout.dockRoot?.type !== "split") {
    throw new Error("expected default dock root split");
  }

  assert.equal(layout.dockRoot.direction, "row");
  assert.equal(layout.dockRoot.ratio, 0.42);
  assert.equal(layout.dockRoot.first.type, "panel");
  assert.equal(layout.dockRoot.second.type, "panel");
  assert.equal(layout.dockRoot.first.panelId, "lobby");
  assert.equal(layout.dockRoot.second.panelId, "timer");
  assert.deepEqual(layout.floating, []);
});

test("floating actions update rects and focus z-order without docking panels", () => {
  const layout = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "update-floating-rect",
    panelId: "debug-console",
    rect: { x: 20, y: 24, width: 480, height: 360 },
  });

  assert.equal(layout.activePanelId, "debug-console");
  assert.equal(layout.floating.length, 1);
  assert.deepEqual(layout.floating[0]?.rect, { x: 20, y: 24, width: 480, height: 360 });

  const focused = panelLayoutReducer(layout, {
    type: "focus-floating-panel",
    panelId: "debug-console",
  });

  assert.equal(focused.floating[0]?.zIndex, (layout.floating[0]?.zIndex ?? 0) + 1);
  assert.equal(focused.dockRoot, layout.dockRoot);
});

test("split ratio updates are clamped by descendant minimum sizes", () => {
  const layout = createDefaultPanelLayout();
  const updated = panelLayoutReducer(layout, {
    type: "update-split-ratio",
    splitId: "split-core-lobby-timer",
    ratio: 0.1,
    availableSize: 1600,
  });

  if (updated.dockRoot?.type !== "split") {
    throw new Error("expected default dock root split");
  }

  assert.equal(updated.dockRoot.ratio, 0.1);
});

test("split ratio updates remember the measured split size for docked resizing", () => {
  const docked = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "dock-panel",
    panelId: "globe",
    placement: "bottom",
  });
  const updated = panelLayoutReducer(docked, {
    type: "update-split-ratio",
    splitId: "split-globe-split-core-lobby-timer-column",
    ratio: 0.6,
    availableSize: 1200,
  });

  if (updated.dockRoot?.type !== "split") {
    throw new Error("expected root split after docking Globe");
  }

  assert.equal(updated.dockRoot.direction, "column");
  assert.equal(updated.dockRoot.ratio, 0.6);
  assert.equal(updated.dockRoot.availableSize, 1200);
});

test("empty dock cells validate and contribute to split minimum sizes", () => {
  const layout: PanelLayoutState = {
    ...createDefaultPanelLayout(),
    dockRoot: {
      type: "split",
      id: "split-lobby-empty-row",
      direction: "row",
      ratio: 0.5,
      first: createDefaultPanelLayout().dockRoot?.type === "split" ? createDefaultPanelLayout().dockRoot.first : createDockEmptyNode("fallback"),
      second: createDockEmptyNode("right-slot"),
    },
  };

  assert.equal(validatePanelLayout(layout), layout);

  const updated = panelLayoutReducer(layout, {
    type: "update-split-ratio",
    splitId: "split-lobby-empty-row",
    ratio: 0.1,
    availableSize: 1000,
  });

  if (updated.dockRoot?.type !== "split") {
    throw new Error("expected split with empty cell");
  }

  assert.equal(updated.dockRoot.ratio, 0.1);
});

test("validation rejects malformed empty dock cells", () => {
  const layout = createDefaultPanelLayout();

  assert.equal(
    validatePanelLayout({
      ...layout,
      dockRoot: { type: "empty", id: "", minWidth: 360, minHeight: 220 },
    }),
    null,
  );
  assert.equal(
    validatePanelLayout({
      ...layout,
      dockRoot: { type: "empty", id: "empty-bad", minWidth: 0, minHeight: 1 },
    }),
    null,
  );
  assert.equal(
    validatePanelLayout({
      ...layout,
      dockRoot: { type: "empty", id: "empty-panelish", panelId: "globe", minWidth: 360, minHeight: 220 },
    }),
    null,
  );
});

test("serialization helpers round-trip layouts with empty dock cells", () => {
  const layout: PanelLayoutState = {
    ...createDefaultPanelLayout(),
    dockRoot: {
      type: "split",
      id: "split-empty-globe-row",
      direction: "row",
      ratio: 0.34,
      first: createDockEmptyNode("left-slot"),
      second: {
        type: "panel",
        id: "panel-globe",
        panelId: "globe",
        minWidth: 520,
        minHeight: 420,
      },
    },
  };

  assert.deepEqual(parsePanelLayout(serializePanelLayout(layout)), layout);
});

test("dock-panel moves a floating panel beside a target panel", () => {
  const floating = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "update-floating-rect",
    panelId: "debug-console",
    rect: { x: 12, y: 18, width: 420, height: 320 },
  });
  const docked = panelLayoutReducer(floating, {
    type: "dock-panel",
    panelId: "debug-console",
    targetPanelId: "lobby",
    placement: "left",
  });

  assert.equal(docked.floating.some((panel) => panel.panelId === "debug-console"), false);
  assert.equal(docked.activePanelId, "debug-console");

  if (docked.dockRoot?.type !== "split" || docked.dockRoot.first.type !== "split") {
    throw new Error("expected debug console to be wrapped beside lobby");
  }

  assert.equal(docked.dockRoot.first.direction, "row");
  assert.equal(docked.dockRoot.first.first.type, "panel");
  assert.equal(docked.dockRoot.first.second.type, "panel");
  assert.equal(docked.dockRoot.first.first.panelId, "debug-console");
  assert.equal(docked.dockRoot.first.second.panelId, "lobby");
});

test("dock-panel without a target docks to the workspace bottom", () => {
  const floating = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "update-floating-rect",
    panelId: "globe",
    rect: { x: 40, y: 50, width: 700, height: 500 },
  });
  const docked = panelLayoutReducer(floating, {
    type: "dock-panel",
    panelId: "globe",
    placement: "bottom",
  });

  assert.equal(docked.floating.some((panel) => panel.panelId === "globe"), false);
  assert.equal(docked.activePanelId, "globe");

  if (docked.dockRoot?.type !== "split") {
    throw new Error("expected workspace root split after bottom docking");
  }

  assert.equal(docked.dockRoot.direction, "column");
  assert.equal(docked.dockRoot.first.type, "split");
  assert.equal(docked.dockRoot.second.type, "panel");
  assert.equal(docked.dockRoot.second.panelId, "globe");

  if (docked.dockRoot.first.type !== "split") {
    throw new Error("expected original Lobby/Timer row to remain intact");
  }

  assert.equal(docked.dockRoot.first.first.type, "panel");
  assert.equal(docked.dockRoot.first.second.type, "panel");
  assert.equal(docked.dockRoot.first.first.panelId, "lobby");
  assert.equal(docked.dockRoot.first.second.panelId, "timer");
});

test("dock-panel without a target docks to the workspace right", () => {
  const docked = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "dock-panel",
    panelId: "admin",
    placement: "right",
  });

  if (docked.dockRoot?.type !== "split") {
    throw new Error("expected workspace root split after right docking");
  }

  assert.equal(docked.activePanelId, "admin");
  assert.equal(docked.dockRoot.direction, "row");
  assert.equal(docked.dockRoot.first.type, "split");
  assert.equal(docked.dockRoot.second.type, "panel");
  assert.equal(docked.dockRoot.second.panelId, "admin");

  if (docked.dockRoot.first.type !== "split") {
    throw new Error("expected original Lobby/Timer row to remain intact");
  }

  assert.equal(docked.dockRoot.first.first.type, "panel");
  assert.equal(docked.dockRoot.first.second.type, "panel");
  assert.equal(docked.dockRoot.first.first.panelId, "lobby");
  assert.equal(docked.dockRoot.first.second.panelId, "timer");
});

test("dock-panel without a target creates a root panel when the workspace is empty", () => {
  const emptyLayout: PanelLayoutState = {
    ...createDefaultPanelLayout(),
    dockRoot: null,
    activePanelId: undefined,
  };
  const docked = panelLayoutReducer(emptyLayout, {
    type: "dock-panel",
    panelId: "debug-console",
    placement: "bottom",
  });

  assert.equal(docked.activePanelId, "debug-console");
  assert.equal(docked.dockRoot?.type, "panel");
  assert.equal(docked.dockRoot?.panelId, "debug-console");
});

test("create-empty-cell-from-panel-edge creates a right empty cell beside a docked panel", () => {
  const docked = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "dock-panel",
    panelId: "globe",
    placement: "bottom",
  });
  const updated = panelLayoutReducer(docked, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "right",
    ratio: 0.65,
    availableSize: 1600,
  });

  if (updated.dockRoot?.type !== "split" || updated.dockRoot.second.type !== "split") {
    throw new Error("expected Globe to be wrapped in a right-edge split");
  }

  assert.equal(updated.dockRoot.second.direction, "row");
  assert.equal(updated.dockRoot.second.ratio, 0.65);
  assert.equal(updated.dockRoot.second.availableSize, undefined);
  assert.equal(updated.dockRoot.second.first.type, "panel");
  assert.equal(updated.dockRoot.second.first.panelId, "globe");
  assert.equal(updated.dockRoot.second.second.type, "empty");
  assert.equal(updated.dockRoot.second.second.id, "empty-globe-right-slot");
});

test("create-empty-cell-from-panel-edge creates a left empty cell beside a docked panel", () => {
  const docked = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "dock-panel",
    panelId: "globe",
    placement: "bottom",
  });
  const updated = panelLayoutReducer(docked, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "left",
    ratio: 0.35,
    availableSize: 1600,
  });

  if (updated.dockRoot?.type !== "split" || updated.dockRoot.second.type !== "split") {
    throw new Error("expected Globe to be wrapped in a left-edge split");
  }

  assert.equal(updated.dockRoot.second.direction, "row");
  assert.equal(updated.dockRoot.second.ratio, 0.35);
  assert.equal(updated.dockRoot.second.first.type, "empty");
  assert.equal(updated.dockRoot.second.first.id, "empty-globe-left-slot");
  assert.equal(updated.dockRoot.second.second.type, "panel");
  assert.equal(updated.dockRoot.second.second.panelId, "globe");
});

test("create-empty-cell-from-panel-edge creates bottom empty cells and resizes top neighbors", () => {
  const docked = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "dock-panel",
    panelId: "globe",
    placement: "bottom",
  });
  const bottom = panelLayoutReducer(docked, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "bottom",
    ratio: 0.6,
    availableSize: 1200,
  });
  const top = panelLayoutReducer(docked, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "top",
    ratio: 0.4,
    availableSize: 1200,
  });

  if (bottom.dockRoot?.type !== "split" || bottom.dockRoot.second.type !== "split" || top.dockRoot?.type !== "split") {
    throw new Error("expected Globe bottom edge to create a split and top edge to resize the root split");
  }

  assert.equal(bottom.dockRoot.second.direction, "column");
  assert.equal(bottom.dockRoot.second.first.type, "panel");
  assert.equal(bottom.dockRoot.second.first.panelId, "globe");
  assert.equal(bottom.dockRoot.second.second.type, "empty");
  assert.equal(bottom.dockRoot.second.second.id, "empty-globe-bottom-slot");

  assert.equal(top.dockRoot.direction, "column");
  assert.equal(top.dockRoot.ratio, 0.7);
  assert.equal(top.dockRoot.first.type, "split");
  assert.equal(top.dockRoot.second.type, "panel");
  assert.equal(top.dockRoot.second.panelId, "globe");
});

test("create-empty-cell-from-panel-edge reuses an existing direct empty edge split without compounding ratios", () => {
  const docked = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "dock-panel",
    panelId: "globe",
    placement: "bottom",
  });
  const first = panelLayoutReducer(docked, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "right",
    ratio: 0.65,
    availableSize: 1600,
  });
  const second = panelLayoutReducer(first, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "right",
    ratio: 0.55,
    availableSize: 1600,
  });
  const withLeftEmpty = panelLayoutReducer(docked, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "left",
    ratio: 0.35,
    availableSize: 1600,
  });
  const updatedLeft = panelLayoutReducer(withLeftEmpty, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "left",
    ratio: 0.45,
    availableSize: 1600,
  });

  if (second.dockRoot?.type !== "split" || second.dockRoot.second.type !== "split" || updatedLeft.dockRoot?.type !== "split" || updatedLeft.dockRoot.second.type !== "split") {
    throw new Error("expected existing right-edge split to be reused");
  }

  assert.equal(second.dockRoot.second.ratio, 0.55);
  assert.equal(second.dockRoot.second.availableSize, undefined);
  assert.equal(second.dockRoot.second.first.type, "panel");
  assert.equal(second.dockRoot.second.first.panelId, "globe");
  assert.equal(second.dockRoot.second.second.type, "empty");
  assert.equal(updatedLeft.dockRoot.second.ratio, 0.45);
  assert.equal(updatedLeft.dockRoot.second.availableSize, undefined);
  assert.equal(updatedLeft.dockRoot.second.first.type, "empty");
  assert.equal(updatedLeft.dockRoot.second.second.type, "panel");
  assert.equal(updatedLeft.dockRoot.second.second.panelId, "globe");
});

test("create-empty-cell-from-panel-edge resizes direct panel neighbors instead of adding empty cells", () => {
  const defaultLayout = createDefaultPanelLayout();
  const shrinkLobby = panelLayoutReducer(defaultLayout, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "lobby",
    edge: "right",
    ratio: 0.8,
    availableSize: 672,
  });

  if (shrinkLobby.dockRoot?.type !== "split") {
    throw new Error("expected root split");
  }

  assert.equal(shrinkLobby.dockRoot.first.type, "panel");
  assert.equal(shrinkLobby.dockRoot.second.type, "panel");
  assert.equal(shrinkLobby.dockRoot.ratio, 0.336);
  assert.equal(shrinkLobby.dockRoot.availableSize, 1600);

  const growLobbyFromTimerLeft = panelLayoutReducer(defaultLayout, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "timer",
    edge: "left",
    ratio: 0.25,
    availableSize: 928,
  });

  if (growLobbyFromTimerLeft.dockRoot?.type !== "split") {
    throw new Error("expected root split");
  }

  assert.equal(growLobbyFromTimerLeft.dockRoot.first.type, "panel");
  assert.equal(growLobbyFromTimerLeft.dockRoot.second.type, "panel");
  assert.equal(growLobbyFromTimerLeft.dockRoot.ratio, 0.565);
  assert.ok(Math.abs((growLobbyFromTimerLeft.dockRoot.availableSize ?? 0) - 1600) < 0.001);
});

test("create-empty-cell-from-panel-edge collapses direct empty slots when the panel expands over them", () => {
  const docked = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "dock-panel",
    panelId: "globe",
    placement: "bottom",
  });
  const withRightEmpty = panelLayoutReducer(docked, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "right",
    ratio: 0.65,
    availableSize: 1600,
  });
  const collapsedRight = panelLayoutReducer(withRightEmpty, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "right",
    ratio: 1,
    availableSize: 1040,
  });
  const withLeftEmpty = panelLayoutReducer(docked, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "left",
    ratio: 0.35,
    availableSize: 1600,
  });
  const collapsedLeft = panelLayoutReducer(withLeftEmpty, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "left",
    ratio: 0,
    availableSize: 1040,
  });

  if (collapsedRight.dockRoot?.type !== "split" || collapsedLeft.dockRoot?.type !== "split") {
    throw new Error("expected root split");
  }

  assert.equal(collapsedRight.dockRoot.second.type, "panel");
  assert.equal(collapsedRight.dockRoot.second.panelId, "globe");
  assert.equal(collapsedLeft.dockRoot.second.type, "panel");
  assert.equal(collapsedLeft.dockRoot.second.panelId, "globe");
});

test("create-empty-cell-from-panel-edge cancels new empty cells only at the near-closed pixel threshold", () => {
  const docked = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "dock-panel",
    panelId: "globe",
    placement: "bottom",
  });
  const withRightEmpty = panelLayoutReducer(docked, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "right",
    ratio: 0.65,
    availableSize: 1600,
  });
  const collapsedRight = panelLayoutReducer(withRightEmpty, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "right",
    ratio: 0.991,
    availableSize: 1600,
  });
  const stillOpenRight = panelLayoutReducer(withRightEmpty, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "right",
    ratio: 0.99,
    availableSize: 1600,
  });
  const withLeftEmpty = panelLayoutReducer(docked, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "left",
    ratio: 0.35,
    availableSize: 1600,
  });
  const collapsedLeft = panelLayoutReducer(withLeftEmpty, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "left",
    ratio: 0.009,
    availableSize: 1600,
  });
  const stillOpenLeft = panelLayoutReducer(withLeftEmpty, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "left",
    ratio: 0.01,
    availableSize: 1600,
  });

  if (collapsedRight.dockRoot?.type !== "split" || collapsedLeft.dockRoot?.type !== "split" || stillOpenRight.dockRoot?.type !== "split" || stillOpenLeft.dockRoot?.type !== "split") {
    throw new Error("expected root split");
  }

  assert.equal(collapsedRight.dockRoot.second.type, "panel");
  assert.equal(collapsedRight.dockRoot.second.panelId, "globe");
  assert.equal(collapsedLeft.dockRoot.second.type, "panel");
  assert.equal(collapsedLeft.dockRoot.second.panelId, "globe");
  assert.equal(stillOpenRight.dockRoot.second.type, "split");
  assert.equal(stillOpenLeft.dockRoot.second.type, "split");
});

test("split resize collapses a right empty cell when it is dragged nearly closed", () => {
  const withRightEmpty = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "create-empty-cell-from-panel-edge",
    panelId: "timer",
    edge: "right",
    ratio: 0.68,
    availableSize: 1000,
  });
  const almostClosed = panelLayoutReducer(withRightEmpty, {
    type: "update-split-ratio",
    splitId: "split-empty-timer-right",
    ratio: 0.986,
    availableSize: 1000,
  });
  const stillOpen = panelLayoutReducer(withRightEmpty, {
    type: "update-split-ratio",
    splitId: "split-empty-timer-right",
    ratio: 0.984,
    availableSize: 1000,
  });

  if (almostClosed.dockRoot?.type !== "split" || stillOpen.dockRoot?.type !== "split") {
    throw new Error("expected root split");
  }

  assert.equal(almostClosed.dockRoot.first.type, "panel");
  assert.equal(almostClosed.dockRoot.first.panelId, "lobby");
  assert.equal(almostClosed.dockRoot.second.type, "panel");
  assert.equal(almostClosed.dockRoot.second.panelId, "timer");

  assert.equal(stillOpen.dockRoot.second.type, "split");

  if (stillOpen.dockRoot.second.type !== "split") {
    throw new Error("expected right empty split to remain open above the collapse threshold");
  }

  assert.equal(stillOpen.dockRoot.second.first.type, "panel");
  assert.equal(stillOpen.dockRoot.second.first.panelId, "timer");
  assert.equal(stillOpen.dockRoot.second.second.type, "empty");
});

test("split resize collapses left and bottom empty cells at the near-closed threshold", () => {
  const withLeftEmpty = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "create-empty-cell-from-panel-edge",
    panelId: "lobby",
    edge: "left",
    ratio: 0.32,
    availableSize: 1000,
  });
  const collapsedLeft = panelLayoutReducer(withLeftEmpty, {
    type: "update-split-ratio",
    splitId: "split-empty-lobby-left",
    ratio: 0.014,
    availableSize: 1000,
  });
  const withBottomEmpty = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "create-empty-cell-from-panel-edge",
    panelId: "timer",
    edge: "bottom",
    ratio: 0.62,
    availableSize: 1000,
  });
  const collapsedBottom = panelLayoutReducer(withBottomEmpty, {
    type: "update-split-ratio",
    splitId: "split-empty-timer-bottom",
    ratio: 0.986,
    availableSize: 1000,
  });

  if (collapsedLeft.dockRoot?.type !== "split" || collapsedBottom.dockRoot?.type !== "split") {
    throw new Error("expected root split");
  }

  assert.equal(collapsedLeft.dockRoot.first.type, "panel");
  assert.equal(collapsedLeft.dockRoot.first.panelId, "lobby");
  assert.equal(collapsedLeft.dockRoot.second.type, "panel");
  assert.equal(collapsedLeft.dockRoot.second.panelId, "timer");

  assert.equal(collapsedBottom.dockRoot.first.type, "panel");
  assert.equal(collapsedBottom.dockRoot.first.panelId, "lobby");
  assert.equal(collapsedBottom.dockRoot.second.type, "panel");
  assert.equal(collapsedBottom.dockRoot.second.panelId, "timer");
});

test("create-empty-cell-from-panel-edge clamps ratios and no-ops for undocked panels", () => {
  const docked = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "dock-panel",
    panelId: "globe",
    placement: "bottom",
  });
  const clamped = panelLayoutReducer(docked, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "globe",
    edge: "right",
    ratio: 0.1,
    availableSize: 1600,
  });
  const defaultLayout = createDefaultPanelLayout();
  const unchanged = panelLayoutReducer(defaultLayout, {
    type: "create-empty-cell-from-panel-edge",
    panelId: "debug-console",
    edge: "right",
    ratio: 0.5,
    availableSize: 1000,
  });

  if (clamped.dockRoot?.type !== "split" || clamped.dockRoot.second.type !== "split") {
    throw new Error("expected clamped edge split");
  }

  assert.equal(clamped.dockRoot.second.ratio, 0.1);
  assert.equal(unchanged, defaultLayout);
});

test("undock-panel removes a docked panel, collapses the split, and creates a floating panel", () => {
  const docked = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "dock-panel",
    panelId: "debug-console",
    targetPanelId: "timer",
    placement: "right",
  });
  const undocked = panelLayoutReducer(docked, {
    type: "undock-panel",
    panelId: "debug-console",
    rect: { x: 80, y: 90, width: 500, height: 340 },
  });

  assert.equal(undocked.floating.length, 1);
  assert.equal(undocked.floating[0]?.panelId, "debug-console");
  assert.deepEqual(undocked.floating[0]?.rect, { x: 80, y: 90, width: 500, height: 340 });

  if (undocked.dockRoot?.type !== "split") {
    throw new Error("expected core split to remain after undocking extra panel");
  }

  assert.equal(undocked.dockRoot.second.type, "panel");
  assert.equal(undocked.dockRoot.second.panelId, "timer");
});

test("float-docked-panel-preserve-cell floats bottom-docked Globe and leaves an empty slot", () => {
  const docked = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "dock-panel",
    panelId: "globe",
    placement: "bottom",
  });
  const floated = panelLayoutReducer(docked, {
    type: "float-docked-panel-preserve-cell",
    panelId: "globe",
    rect: { x: 120, y: 140, width: 760, height: 520 },
    emptyCellId: "globe-old-slot",
  });

  assert.equal(floated.activePanelId, "globe");
  assert.equal(floated.collapsed.includes("globe"), false);
  assert.equal(floated.floating.length, 1);
  assert.equal(floated.floating[0]?.panelId, "globe");
  assert.deepEqual(floated.floating[0]?.rect, { x: 120, y: 140, width: 760, height: 520 });

  if (floated.dockRoot?.type !== "split") {
    throw new Error("expected root split to remain after preserving Globe slot");
  }

  assert.equal(floated.dockRoot.direction, "column");
  assert.equal(floated.dockRoot.ratio, docked.dockRoot?.type === "split" ? docked.dockRoot.ratio : undefined);
  assert.equal(floated.dockRoot.first.type, "split");
  assert.equal(floated.dockRoot.second.type, "empty");
  assert.equal(floated.dockRoot.second.id, "empty-globe-old-slot");
  assert.equal(floated.dockRoot.second.minWidth, 1);
  assert.equal(floated.dockRoot.second.minHeight, 1);
});

test("float-docked-panel-preserve-cell preserves nested split structure", () => {
  const withAdmin = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "dock-panel",
    panelId: "admin",
    placement: "right",
  });
  const nested = panelLayoutReducer(withAdmin, {
    type: "dock-panel",
    panelId: "debug-console",
    targetPanelId: "admin",
    placement: "left",
  });
  const floated = panelLayoutReducer(nested, {
    type: "float-docked-panel-preserve-cell",
    panelId: "debug-console",
    rect: { x: 42, y: 52, width: 500, height: 360 },
    emptyCellId: "debug-console-origin",
  });

  if (floated.dockRoot?.type !== "split" || floated.dockRoot.second.type !== "split") {
    throw new Error("expected nested split to remain after preserving Debug Console slot");
  }

  assert.equal(floated.dockRoot.direction, "row");
  assert.equal(floated.dockRoot.second.direction, "row");
  assert.equal(floated.dockRoot.second.ratio, nested.dockRoot?.type === "split" && nested.dockRoot.second.type === "split" ? nested.dockRoot.second.ratio : undefined);
  assert.equal(floated.dockRoot.second.first.type, "empty");
  assert.equal(floated.dockRoot.second.first.id, "empty-debug-console-origin");
  assert.equal(floated.dockRoot.second.second.type, "panel");
  assert.equal(floated.dockRoot.second.second.panelId, "admin");
  assert.equal(floated.floating.some((panel) => panel.panelId === "debug-console"), true);
});

test("float-docked-panel-preserve-cell is a no-op when the panel is not docked", () => {
  const layout = createDefaultPanelLayout();
  const nextLayout = panelLayoutReducer(layout, {
    type: "float-docked-panel-preserve-cell",
    panelId: "debug-console",
    rect: { x: 80, y: 90, width: 500, height: 340 },
  });

  assert.equal(nextLayout, layout);
});

test("dock-panel-in-empty-cell replaces a preserved bottom empty slot with a floating panel", () => {
  const dockedGlobe = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "dock-panel",
    panelId: "globe",
    placement: "bottom",
  });
  const withBottomEmpty = panelLayoutReducer(dockedGlobe, {
    type: "float-docked-panel-preserve-cell",
    panelId: "globe",
    emptyCellId: "globe-old-slot",
  });
  const withFloatingDebugConsole: PanelLayoutState = {
    ...panelLayoutReducer(withBottomEmpty, {
      type: "update-floating-rect",
      panelId: "debug-console",
      rect: { x: 20, y: 30, width: 500, height: 340 },
    }),
    collapsed: ["debug-console"],
  };
  const filled = panelLayoutReducer(withFloatingDebugConsole, {
    type: "dock-panel-in-empty-cell",
    panelId: "debug-console",
    emptyCellId: "globe-old-slot",
  });

  assert.equal(filled.activePanelId, "debug-console");
  assert.equal(filled.floating.some((panel) => panel.panelId === "debug-console"), false);
  assert.equal(filled.collapsed.includes("debug-console"), false);

  if (filled.dockRoot?.type !== "split") {
    throw new Error("expected bottom split to remain after filling empty slot");
  }

  assert.equal(filled.dockRoot.direction, "column");
  assert.equal(filled.dockRoot.first.type, "split");
  assert.equal(filled.dockRoot.second.type, "panel");
  assert.equal(filled.dockRoot.second.panelId, "debug-console");
});

test("dock-panel-in-empty-cell replaces nested empty cells without resizing neighboring splits", () => {
  const withAdmin = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "dock-panel",
    panelId: "admin",
    placement: "right",
  });
  const nested = panelLayoutReducer(withAdmin, {
    type: "dock-panel",
    panelId: "debug-console",
    targetPanelId: "admin",
    placement: "left",
  });
  const withNestedEmpty = panelLayoutReducer(nested, {
    type: "float-docked-panel-preserve-cell",
    panelId: "debug-console",
    emptyCellId: "debug-console-origin",
  });
  const withFloatingGlobe = panelLayoutReducer(withNestedEmpty, {
    type: "update-floating-rect",
    panelId: "globe",
    rect: { x: 40, y: 50, width: 720, height: 480 },
  });
  const filled = panelLayoutReducer(withFloatingGlobe, {
    type: "dock-panel-in-empty-cell",
    panelId: "globe",
    emptyCellId: "empty-debug-console-origin",
  });

  if (filled.dockRoot?.type !== "split" || filled.dockRoot.second.type !== "split") {
    throw new Error("expected nested split to remain after filling empty slot");
  }

  assert.equal(filled.dockRoot.ratio, withNestedEmpty.dockRoot?.type === "split" ? withNestedEmpty.dockRoot.ratio : undefined);
  assert.equal(filled.dockRoot.second.ratio, nested.dockRoot?.type === "split" && nested.dockRoot.second.type === "split" ? nested.dockRoot.second.ratio : undefined);
  assert.equal(filled.dockRoot.second.first.type, "panel");
  assert.equal(filled.dockRoot.second.first.panelId, "globe");
  assert.equal(filled.dockRoot.second.second.type, "panel");
  assert.equal(filled.dockRoot.second.second.panelId, "admin");
  assert.equal(filled.floating.some((panel) => panel.panelId === "globe"), false);
});

test("dock-panel-in-empty-cell is a no-op when the empty cell does not exist", () => {
  const layout = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "update-floating-rect",
    panelId: "debug-console",
    rect: { x: 80, y: 90, width: 500, height: 340 },
  });
  const nextLayout = panelLayoutReducer(layout, {
    type: "dock-panel-in-empty-cell",
    panelId: "debug-console",
    emptyCellId: "missing-slot",
  });

  assert.equal(nextLayout, layout);
});

test("dock-panel-in-empty-cell moves an already docked panel and collapses its previous dock location", () => {
  const dockedGlobe = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "dock-panel",
    panelId: "globe",
    placement: "bottom",
  });
  const withBottomEmpty = panelLayoutReducer(dockedGlobe, {
    type: "float-docked-panel-preserve-cell",
    panelId: "globe",
    emptyCellId: "globe-old-slot",
  });
  const withDockedDebugConsole = panelLayoutReducer(withBottomEmpty, {
    type: "dock-panel",
    panelId: "debug-console",
    targetPanelId: "timer",
    placement: "right",
  });
  const moved = panelLayoutReducer(withDockedDebugConsole, {
    type: "dock-panel-in-empty-cell",
    panelId: "debug-console",
    emptyCellId: "globe-old-slot",
  });

  if (moved.dockRoot?.type !== "split" || moved.dockRoot.first.type !== "split") {
    throw new Error("expected root and core splits after moving docked panel into empty slot");
  }

  assert.equal(moved.dockRoot.second.type, "panel");
  assert.equal(moved.dockRoot.second.panelId, "debug-console");
  assert.equal(moved.dockRoot.first.first.type, "panel");
  assert.equal(moved.dockRoot.first.first.panelId, "lobby");
  assert.equal(moved.dockRoot.first.second.type, "panel");
  assert.equal(moved.dockRoot.first.second.panelId, "timer");
});

test("undock-panel is a no-op when the panel is not docked", () => {
  const layout = createDefaultPanelLayout();
  const nextLayout = panelLayoutReducer(layout, {
    type: "undock-panel",
    panelId: "debug-console",
    rect: { x: 80, y: 90, width: 500, height: 340 },
  });

  assert.equal(nextLayout, layout);
});

test("remove-docked-panel collapses empty parent splits and reset restores defaults", () => {
  const withoutLobby = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "remove-docked-panel",
    panelId: "lobby",
  });

  assert.equal(withoutLobby.dockRoot?.type, "panel");
  assert.equal(withoutLobby.dockRoot?.panelId, "timer");
  assert.deepEqual(withoutLobby.collapsed, ["lobby"]);

  const reset = panelLayoutReducer(withoutLobby, { type: "reset-layout" });
  assert.deepEqual(reset, createDefaultPanelLayout());
});

test("remove-docked-panel is a no-op when the panel is not docked", () => {
  const layout = createDefaultPanelLayout();
  const nextLayout = panelLayoutReducer(layout, {
    type: "remove-docked-panel",
    panelId: "debug-console",
  });

  assert.equal(nextLayout, layout);
});

test("validation rejects malformed layouts and unknown panel ids", () => {
  const valid = createDefaultPanelLayout();
  assert.equal(validatePanelLayout(valid), valid);

  assert.equal(validatePanelLayout({ ...valid, version: 999 }), null);
  assert.equal(validatePanelLayout({ version: PANEL_LAYOUT_VERSION, floating: [], collapsed: [] }), null);
  assert.equal(validatePanelLayout({ ...valid, dockRoot: undefined }), null);
  assert.equal(
    validatePanelLayout({
      ...valid,
      dockRoot: {
        type: "panel",
        id: "panel-unknown",
        panelId: "unknown",
        minWidth: 100,
        minHeight: 100,
      },
    }),
    null,
  );
  assert.equal(
    validatePanelLayout({
      ...valid,
      floating: [{ panelId: "admin", rect: { x: 1, y: 2, width: 0, height: 100 }, zIndex: 91 }],
    }),
    null,
  );
});

test("serialization helpers round-trip valid layout data without touching storage", () => {
  const layout: PanelLayoutState = panelLayoutReducer(createDefaultPanelLayout(), {
    type: "update-floating-rect",
    panelId: "admin",
    rect: { x: 40, y: 44, width: 520, height: 420 },
  });
  const serialized = serializePanelLayout(layout);

  assert.deepEqual(parsePanelLayout(serialized), layout);
  assert.equal(parsePanelLayout("{not json"), null);
});
