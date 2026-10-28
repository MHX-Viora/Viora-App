import assert from 'node:assert/strict';
import test from 'node:test';
import Module, { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), React = require('react'), native = require('react-native-web');
const ts = require('typescript'), { renderToStaticMarkup } = require('react-dom/server');
function render(enabled, { isDesktopWeb = false, bottom = 0 } = {}) {
  const filename = fileURLToPath(new URL('../../utilities/utilities-screen.tsx', import.meta.url));
  const routes = []; let wallet, section, promotion, contentStyle;
  const overrides = {
    'react-native': { ...native, ScrollView: React.forwardRef((props, ref) => {
      contentStyle = native.StyleSheet.flatten(props.contentContainerStyle);
      return React.createElement(native.ScrollView, { ...props, ref });
    }) }, '@react-navigation/native': { useFocusEffect: () => {} },
    'expo-router': { router: { push: path => routes.push(path) } }, '@expo/vector-icons/Ionicons': () => null,
    'react-native-safe-area-context': { SafeAreaView: native.View, useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom }) },
    '@/components/layout/tab-bar-style': { TAB_BAR_BOTTOM: 0, TAB_BAR_HEIGHT: 80 },
    '@/components/wallet/wallet-summary-card': { WalletSummaryCard: props => { wallet = props; return React.createElement('div', {}, 'WALLET'); } },
    '@/components/utilities/wallet-promotion-row': { WalletPromotionRow: props => { promotion = props; return React.createElement('div', {}, props.children); } },
    '@/components/mini-apps/mini-app-section': { MiniAppSection: props => { section = props; return React.createElement('div', {}, 'CATALOG_ERROR_RETRY'); } },
    '@/components/utilities/featured-brands-section': { FeaturedBrandsSection: () => React.createElement('div', {}, 'FEATURED_BRANDS') },
    '@/features/mini-apps/lib/host-controller': { miniAppsEnabled: enabled },
    '@/services/utility-banner.service': { getUtilityBanners: async () => [] },
    '@/types/utility-banner': { safeBannerTarget: () => true },
    '@/hooks/use-responsive': { useResponsive: () => ({ isDesktopWeb }) }, '@/services/wallet.service': { getWallet: () => { throw new Error('must remain in focus effect'); } },
    '@/theme': { spacing: { sm: 8, md: 12, lg: 16 }, useTheme: () => ({ theme: { colors: {}, wallet: {} } }) },
  };
  const module = new Module(filename); module.filename = filename;
  module.require = name => Object.hasOwn(overrides, name) ? overrides[name] : require(name);
  module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  const html = renderToStaticMarkup(React.createElement(module.exports.UtilitiesScreen));
  return { html, routes, wallet, section, promotion, contentStyle };
}

test('utilities reserve bottom navigation and safe area space on mobile', () => {
  for (const bottom of [0, 34]) {
    assert.equal(render(true, { bottom }).contentStyle.paddingBottom, 80 + bottom + 16);
  }
  assert.equal(render(true, { isDesktopWeb: true, bottom: 34 }).contentStyle.paddingBottom, 44);
});
test('catalog follows Wallet before featured brands; Wallet actions survive catalog failure', () => {
  const result = render(true);
  assert.ok(result.html.indexOf('WALLET') < result.html.indexOf('CATALOG_ERROR_RETRY'));
  assert.ok(result.html.indexOf('CATALOG_ERROR_RETRY') < result.html.indexOf('FEATURED_BRANDS'));
  assert.equal(result.html.includes('Nhiều tiện ích hơn đang chờ bạn!'), false);
  assert.equal(result.html.includes('Quản lý ví và các tiện ích'), false);
  assert.equal(result.html.includes('>Tiện ích<'), false);
  result.wallet.onDeposit(); result.wallet.onHistory(); result.wallet.onWithdraw();
  assert.equal(result.wallet.onManage, undefined);
  assert.equal(typeof result.promotion.onExplore, 'function');
  const appId = 'app_' + 'a'.repeat(43); result.section.onOpen(appId);
  assert.deepEqual(result.routes, ['/wallet/deposit', '/wallet/history', '/wallet/withdraw', `/mini-apps/${appId}`]);
});
test('default-off integration mounts no catalog and leaves Wallet intact', () => {
  const result = render(false); assert.equal(result.section, undefined);
  assert.equal(result.promotion.onExplore, undefined);
  assert.ok(result.wallet); assert.equal(result.html.includes('CATALOG_ERROR_RETRY'), false);
});
