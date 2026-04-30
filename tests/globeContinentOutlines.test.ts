import assert from "node:assert/strict";
import { test } from "node:test";
import { CONTINENT_OUTLINES } from "../src/lib/globe/continentOutlines";

test("continent outlines include closed coordinate loops", () => {
  assert.ok(CONTINENT_OUTLINES.length >= 6);

  for (const outline of CONTINENT_OUTLINES) {
    assert.ok(outline.coordinates.length >= 4, `${outline.id} should include enough points to draw a loop`);
    assert.deepEqual(outline.coordinates[0], outline.coordinates.at(-1), `${outline.id} should close its loop`);
  }
});

test("continent outline coordinates stay inside valid latitude and longitude ranges", () => {
  for (const outline of CONTINENT_OUTLINES) {
    for (const [latitude, longitude] of outline.coordinates) {
      assert.ok(latitude >= -90 && latitude <= 90, `${outline.id} latitude is out of range`);
      assert.ok(longitude >= -180 && longitude <= 180, `${outline.id} longitude is out of range`);
    }
  }
});

test("north america outline has enough detail to read as a coastline", () => {
  const northAmerica = CONTINENT_OUTLINES.find((outline) => outline.id === "north-america");

  assert.ok(northAmerica, "north america outline should exist");
  assert.ok(northAmerica.coordinates.length >= 35);
});
