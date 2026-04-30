import assert from "node:assert/strict";
import { test } from "node:test";
import { EARTH_TOPO_LINE_SETS, EARTH_TOPO_SOURCE, EARTH_TOPO_STATS } from "../src/lib/globe/earthTopoLines";

test("earth topo line sets include real vector layers", () => {
  assert.match(EARTH_TOPO_SOURCE, /Natural Earth/);
  assert.ok(EARTH_TOPO_LINE_SETS.some((lineSet) => lineSet.kind === "coastline"));
  assert.ok(EARTH_TOPO_LINE_SETS.some((lineSet) => lineSet.kind === "coastlineDetail"));
  assert.ok(EARTH_TOPO_LINE_SETS.some((lineSet) => lineSet.kind === "river"));
  assert.ok(EARTH_TOPO_LINE_SETS.some((lineSet) => lineSet.kind === "lake"));
});

test("earth topo line sets have enough detail for regional coastline recognition", () => {
  assert.ok(EARTH_TOPO_STATS.coastlineGlobal.points > 10_000);
  assert.ok(EARTH_TOPO_STATS.coastlineNorthAmerica.points > 25_000);
});

test("north america detail includes florida and long island regions", () => {
  const northAmerica = EARTH_TOPO_LINE_SETS.find((lineSet) => lineSet.id === "coastline-north-america-detail");

  assert.ok(northAmerica, "north america detail line set should exist");
  assert.ok(hasCoordinateInBox(northAmerica.lines, { minLat: 24.4, maxLat: 30.9, minLon: -87.8, maxLon: -79.5 }), "Florida coastline should be represented");
  assert.ok(hasCoordinateInBox(northAmerica.lines, { minLat: 40.45, maxLat: 41.25, minLon: -74.2, maxLon: -71.7 }), "Long Island coastline should be represented");
});

function hasCoordinateInBox(
  lines: readonly (readonly (readonly [latitude: number, longitude: number])[])[],
  box: { minLat: number; maxLat: number; minLon: number; maxLon: number },
) {
  return lines.some((line) =>
    line.some(([latitude, longitude]) =>
      latitude >= box.minLat && latitude <= box.maxLat && longitude >= box.minLon && longitude <= box.maxLon,
    ),
  );
}
