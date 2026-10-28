import assert from "node:assert/strict";
import test from "node:test";
import { miniAppGridLayout } from "../lib/grid-layout";

test("grid fits narrow, large-font and desktop containers without stretching logos", () => {
  for (const width of [240, 288, 320, 375, 720, 1008]) {
    for (const fontScale of [1, 1.5, 2]) {
      const { columns, cellWidth, gap } = miniAppGridLayout(width, fontScale);
      assert.ok(columns >= 1 && columns <= 6);
      assert.ok(columns * cellWidth + (columns - 1) * gap <= width + 0.1);
      assert.ok(cellWidth > 0);
    }
  }
  assert.equal(miniAppGridLayout(375).columns, 4);
  assert.equal(miniAppGridLayout(288, 2).columns, 1);
  assert.equal(miniAppGridLayout(375, 2).columns, 2);
  assert.equal(miniAppGridLayout(Number.NaN).columns, 1);
});
