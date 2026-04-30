import assert from "node:assert/strict";
import test from "node:test";
import { PANEL_IDS } from "../src/lib/panels/panelLayout";
import { PANEL_DEFINITIONS, getPanelDefinition, getPanelDefinitions } from "../src/lib/panels/panelRegistry";

test("registry has exactly one definition for every known panel id", () => {
  const definitionKeys = Object.keys(PANEL_DEFINITIONS).sort();
  const panelIds = [...PANEL_IDS].sort();

  assert.deepEqual(definitionKeys, panelIds);
  assert.equal(getPanelDefinitions().length, PANEL_IDS.length);
  assert.deepEqual(
    getPanelDefinitions().map((definition) => definition.id).sort(),
    panelIds,
  );
});

test("registry helpers return the same serializable metadata definitions", () => {
  for (const panelId of PANEL_IDS) {
    const definition = getPanelDefinition(panelId);

    assert.equal(definition, PANEL_DEFINITIONS[panelId]);
    assert.equal(definition.id, panelId);
    assert.equal(typeof definition.title, "string");
    assert.ok(definition.title.length > 0);
    assert.equal(typeof definition.adapterKey, "string");
    assert.ok(definition.adapterKey.length > 0);
    assert.doesNotThrow(() => JSON.stringify(definition));
  }
});

test("registry sizing metadata is positive for every panel", () => {
  for (const definition of getPanelDefinitions()) {
    assert.ok(definition.minWidth > 0, `${definition.id} minWidth should be positive`);
    assert.ok(definition.minHeight > 0, `${definition.id} minHeight should be positive`);
    assert.ok(definition.defaultFloatingRect.width > 0, `${definition.id} floating width should be positive`);
    assert.ok(definition.defaultFloatingRect.height > 0, `${definition.id} floating height should be positive`);
  }
});

test("core Lobby and Timer defaults match the current dashboard split expectations", () => {
  const lobby = getPanelDefinition("lobby");
  const timer = getPanelDefinition("timer");

  assert.equal(lobby.defaultDock, "left");
  assert.equal(timer.defaultDock, "right");
  assert.equal(lobby.canClose, false);
  assert.equal(timer.canClose, false);
  assert.equal(lobby.minWidth, 1);
  assert.equal(timer.minWidth, 1);
  assert.equal(lobby.canDock, true);
  assert.equal(timer.canDock, true);
  assert.equal(lobby.canFloat, true);
  assert.equal(timer.canFloat, true);
});

test("optional workspace panels can close, float, and dock", () => {
  for (const definition of getPanelDefinitions()) {
    if (definition.id === "lobby" || definition.id === "timer") {
      continue;
    }

    assert.equal(definition.canClose, true, `${definition.id} should be closeable`);
    assert.equal(definition.canFloat, true, `${definition.id} should be floatable`);
    assert.equal(definition.canDock, true, `${definition.id} should be dockable`);
  }
});
