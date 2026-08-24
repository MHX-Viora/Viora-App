import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

for (const screen of ["login-screen.tsx", "register-screen.tsx"]) {
  test(`${screen} centers the auth form in the available viewport`, () => {
    const source = readFileSync(new URL(`./${screen}`, import.meta.url), "utf8");
    const contentStyle = source.match(/content:\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? "";

    assert.match(contentStyle, /alignItems:\s*"center"/);
    assert.match(contentStyle, /flexGrow:\s*1/);
    assert.match(contentStyle, /justifyContent:\s*"center"/);
  });
}

test("decorative Google logo does not forward native-only accessibility props on Web", () => {
  const source = readFileSync(
    new URL("../../components/auth/google-logo.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Platform\.OS === "web"/);
  assert.match(source, /nativeAccessibilityProps/);
});
