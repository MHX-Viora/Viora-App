import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const native = require("react-native-web");
const ts = require("typescript");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Compile real TS components without adding a test framework. Native rendering uses
// React Native Web; only icons, theme context and viewport inputs are substituted.
function compile(filename, overrides = {}, cache = new Map()) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = new Module(filename);
  cache.set(filename, compiled);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  compiled.require = (name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith(".") || name.startsWith("@/")) {
      const base = name.startsWith("@/") ? path.join(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
      const candidate = [base + ".ts", base + ".tsx", path.join(base, "index.ts")].find(existsSync);
      if (candidate) return compile(candidate, overrides, cache);
    }
    return require(name);
  };
  compiled._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  }).outputText, filename);
  return compiled.exports;
}

const { modernTheme } = compile(path.join(root, "theme/modern.ts"));
const { classicTheme } = compile(path.join(root, "theme/classic.ts"));
const { premiumOceanTheme } = compile(path.join(root, "theme/premium-ocean.ts"));
const wallet = { id: "fixture", availableBalance: 5457000, heldBalance: 0, anktCoinBalance: 125, currency: "VND", status: 0 };

function render({ theme = modernTheme, width = 1440, measuredWidth = 0, hidden = false, ...props } = {}) {
  const controls = [];
  const calls = [];
  let frame;
  const overrides = {
    "../../assets/images/wallet-card-background.png": { uri: "wallet-card-background.png", width: 1855, height: 848 },
    react: { ...React, useState: (initial) => React.useState(initial === false ? hidden : initial === 0 ? measuredWidth : initial) },
    "react-native": {
      ...native,
      useWindowDimensions: () => ({ width, height: 900, scale: 1, fontScale: 1 }),
      Pressable: (input) => { controls.push(input); return React.createElement(native.Pressable, input); },
      View: (input) => { if (input.onLayout) frame = input; return React.createElement(native.View, input); },
    },
    "@expo/vector-icons/Ionicons": () => null,
    "@/hooks/use-responsive": { useResponsive: () => ({ width, height: 900, isWeb: true, isDesktopWeb: width >= 1024 }) },
    "@/theme": {
      spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
      typography: { title: { fontSize: 20, fontWeight: "700" }, caption: { fontSize: 14, lineHeight: 19 } },
      useTheme: () => ({ theme }),
    },
  };
  const { WalletSummaryCard } = compile(path.join(root, "components/wallet/wallet-summary-card.tsx"), overrides);
  const markup = renderToStaticMarkup(React.createElement(WalletSummaryCard, {
    wallet, onDeposit: () => calls.push("deposit"), onWithdraw: () => calls.push("withdraw"),
    onHistory: () => calls.push("history"), onRetry: () => calls.push("retry"), ...props,
  }));
  return { markup, controls, calls, frame };
}

test("loading retains wallet identity without displaying a fabricated zero", () => {
  const { markup, controls } = render({ loading: true, wallet: null });
  assert.match(markup, /Ví ANKT/);
  assert.match(markup, /Đang tải số dư/);
  assert.doesNotMatch(markup, /0(?:\s|&nbsp;)₫/);
  const actions = controls.filter(control => ["Nạp tiền", "Rút tiền", "Lịch sử"].includes(control.accessibilityLabel));
  assert.equal(actions.length, 3);
  assert.ok(actions.every(control => control.disabled));
});

test("error retains card and exposes retry without leaking raw API details", () => {
  const { markup, controls, calls } = render({ wallet: null, error: "SQL timeout internal-secret" });
  assert.match(markup, /Ví ANKT/);
  assert.match(markup, /Không thể tải số dư/);
  assert.doesNotMatch(markup, /SQL|internal-secret|0(?:\s|&nbsp;)₫/);
  const retry = controls.find(control => control.accessibilityLabel === "Thử lại");
  assert.ok(retry);
  retry.onPress();
  assert.deepEqual(calls, ["retry"]);
});

test("null data is unavailable, while a confirmed zero wallet remains actionable", () => {
  assert.doesNotMatch(render({ wallet: null }).markup, /0(?:\s|&nbsp;)₫/);
  const { markup, controls } = render({ wallet: { ...wallet, availableBalance: 0, anktCoinBalance: 0 } });
  assert.match(markup, /0(?:\s|&nbsp;)₫/);
  assert.equal(controls.find(control => control.accessibilityLabel === "Nạp tiền").disabled, false);
});

test("hidden state masks both balances and exposes the show-balance action", () => {
  const { markup, controls } = render({ hidden: true });
  assert.doesNotMatch(markup, /5\.457\.000|125/);
  assert.match(markup, /••••••••/);
  assert.ok(controls.find(control => control.accessibilityLabel === "Hiện số dư"));
});

test("loaded values and all three navigation callbacks survive each viewport and theme", () => {
  for (const theme of [classicTheme, modernTheme, premiumOceanTheme]) {
    for (const width of [320, 375, 768, 820, 1024, 1440]) {
      const { markup, controls, calls } = render({ theme, width });
      assert.match(markup, /5\.457\.000/);
      assert.match(markup, /125/);
      for (const label of ["Nạp tiền", "Rút tiền", "Lịch sử"]) {
        const control = controls.find(input => input.accessibilityLabel === label);
        assert.ok(control, label);
        assert.equal(control.accessibilityRole, "button");
        control.onPress();
      }
      assert.deepEqual(calls, ["deposit", "withdraw", "history"]);
    }
  }
});

function rgba(value) {
  if (value.startsWith("#")) return [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16)).concat(1);
  if (value === "transparent") return [0, 0, 0, 0];
  const channels = value.match(/[\d.]+/g).map(Number);
  return channels.length === 3 ? [...channels, 1] : channels;
}
function composite(foreground, background) {
  const front = rgba(foreground);
  return front.slice(0, 3).map((channel, index) => channel * front[3] + background[index] * (1 - front[3]));
}
function luminance(rgb) {
  return rgb.map(channel => channel / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}
function contrast(foreground, background) {
  const values = [luminance(composite(foreground, background)), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("wallet text and primary CTA meet AA contrast in all three themes", () => {
  for (const theme of [classicTheme, modernTheme, premiumOceanTheme]) {
    const surface = composite(theme.colors.surface, rgba(theme.colors.background));
    const secondary = composite(theme.colors.secondaryBackground, surface);
    assert.ok(contrast(theme.colors.text, surface) >= 4.5, theme.mode + " primary text");
    assert.ok(contrast(theme.colors.textMuted, surface) >= 4.5, theme.mode + " labels");
    assert.ok(contrast(theme.colors.textMuted, secondary) >= 4.5, theme.mode + " coin label");
    const { controls } = render({ theme });
    const deposit = controls.find(control => control.accessibilityLabel === "Nạp tiền");
    const background = composite(native.StyleSheet.flatten(deposit.style({ pressed: false })).backgroundColor, surface);
    const text = deposit.children.find(child => child?.type === native.Text);
    assert.ok(contrast(text.props.style.color, background) >= 4.5, theme.mode + " deposit text");
  }
});

test("controls have large targets and visible keyboard, hover and press feedback", () => {
  const { controls } = render();
  for (const control of controls) {
    assert.equal(typeof control.onFocus, "function");
    assert.equal(typeof control.onHoverIn, "function");
    const idle = native.StyleSheet.flatten(control.style({ pressed: false }));
    const pressed = native.StyleSheet.flatten(control.style({ pressed: true }));
    assert.ok(idle.minHeight >= 44);
    assert.ok(pressed.opacity < 1);
  }
});

test("mobile actions stack and a narrow card in a wide viewport follows its actual width", () => {
  for (const options of [{ width: 320 }, { width: 375 }, { width: 1440, measuredWidth: 360 }]) {
    const { frame } = render(options);
    const [heading, funds, actions] = frame.children.slice(-3);
    assert.ok(heading);
    assert.equal(native.StyleSheet.flatten(actions.props.style).flexDirection, "column");
    assert.notEqual(native.StyleSheet.flatten(funds.props.style).flexDirection, "row");
    assert.equal(actions.props.children[0].props.fullWidth, true);
  }
});

test("tablet and desktop use a row for actions and side-by-side balances", () => {
  for (const width of [768, 820, 1024, 1440]) {
    const { frame } = render({ width });
    const [, funds, actions] = frame.children.slice(-3);
    assert.equal(native.StyleSheet.flatten(actions.props.style).flexDirection, "row");
    assert.equal(native.StyleSheet.flatten(funds.props.style).flexDirection, "row");
  }
});
