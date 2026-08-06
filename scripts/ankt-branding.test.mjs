import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

const sourceRoots = ["app", "components", "features", "services"];
const sourceExtensions = new Set([".ts", ".tsx"]);

const collectSourceFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return sourceExtensions.has(extname(entry.name)) ? [path] : [];
  });

for (const file of sourceRoots.flatMap(collectSourceFiles)) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(
    source,
    /\bViora\b/,
    `${file} still contains the retired Viora display brand`,
  );
}

const authBackground = readFileSync("components/auth/auth-background.tsx", "utf8");
assert.doesNotMatch(
  authBackground,
  />viora</i,
  "Authentication background still displays the retired Viora brand",
);
