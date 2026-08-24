import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflowModals = [
  { path: "../feed/create-post-modal.tsx", transparent: /\btransparent\b/ },
  { path: "../reels/create-reel-modal.tsx", transparent: /transparent=\{isDesktopWeb\}/ },
  { path: "../feed/feed-search-modal.tsx", transparent: /transparent=\{isDesktopWeb\}/ },
  { path: "../reels/reels-search-modal.tsx", transparent: /transparent=\{isDesktopWeb\}/ },
];

test("desktop creation and search workflows use centered responsive dialogs", () => {
  for (const workflow of workflowModals) {
    const source = readFileSync(new URL(workflow.path, import.meta.url), "utf8");

    assert.match(source, /getResponsiveDialogLayout/);
    assert.match(source, /useResponsive/);
    assert.match(source, workflow.transparent);
    assert.match(source, /dialogLayout\.backdrop/);
    assert.match(source, /dialogLayout\.surface/);
  }
});
