import assert from "node:assert/strict";
import test from "node:test";
import { getCommittedTrackRatio, getLayoutPointerOffset, getLayoutRectSize, getSafeZoomScale, toLayoutPx } from "../src/components/PanelWorkspace";

const zoomedRect = {
  left: 80,
  top: 120,
  width: 640,
  height: 480,
};

test("workspace geometry normalizes visual pixels into layout pixels", () => {
  assert.equal(getSafeZoomScale(0), 1);
  assert.equal(getSafeZoomScale(Number.NaN), 1);
  assert.equal(getSafeZoomScale(0.8), 0.8);
  assert.equal(toLayoutPx(640, 0.8), 800);
  assert.equal(getLayoutRectSize(zoomedRect, "row", 0.8), 800);
  assert.equal(getLayoutRectSize(zoomedRect, "column", 0.8), 600);
});

test("workspace geometry normalizes pointer offsets and preserves split ratios", () => {
  const pointerOffset = getLayoutPointerOffset(zoomedRect, "row", 400, 200, 0.8);
  const availableSize = getLayoutRectSize(zoomedRect, "row", 0.8);

  assert.equal(pointerOffset, 400);
  assert.equal(pointerOffset / availableSize, 0.5);
});

test("committed edge ratios subtract the unscaled split gap", () => {
  const pointerOffset = getLayoutPointerOffset(zoomedRect, "column", 120, 360, 0.8);
  const availableSize = getLayoutRectSize(zoomedRect, "column", 0.8);

  assert.equal(pointerOffset, 300);
  assert.equal(availableSize, 600);
  assert.equal(getCommittedTrackRatio(pointerOffset, availableSize), 300 / 584);
});
