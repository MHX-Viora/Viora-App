import assert from 'node:assert/strict';
import test from 'node:test';
import Module, { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), React = require('react'), native = require('react-native-web');
const ts = require('typescript'), { renderToStaticMarkup } = require('react-dom/server');
function render(enabled) {
  const filename = fileURLToPath(new URL('../../utilities/utilities-screen.tsx', import.meta.url));
  const routes = []; let wallet, section, promotion;
  const overrides = {
    'react-native': native, '@react-navigation/native': { useFocusEffect: () => {} },
    'expo-router': { router: { push: path => routes.push(path) } }, '@expo/vector-icons/Ionicons': () => null,
    'react-native-safe-area-context': { SafeAreaView: native.View },
    '@/components/wallet/wallet-summary-card': { WalletSummaryCard: props => { wallet = props; return React.createElement('div', {}, 'WALLET'); } },
    '@/components/utilities/wallet-promotion-row': { WalletPromotionRow: props => { promotion = props; return React.createElement('div', {}, props.children); } },
    '@/components/mini-apps/mini-app-section': { MiniAppSection: props => { section = props; return React.createElement('div', {}, 'CATALOG_ERROR_RETRY'); } },
    '@/components/utilities/featured-brands-section': { FeaturedBrandsSection: () => React.createElement('div', {}, 'FEATURED_BRANDS') },
    '@/features/mini-apps/lib/host-controller': { miniAppsEnabled: enabled },
    '@/services/utility-banner.service': { getUtilityBanners: async () => [] },
    '@/types/utility-banner': { safeBannerTarget: () => true },
    '@/hooks/use-responsive': { useResponsive: () => ({ isDesktopWeb: false }) }, '@/services/wallet.service': { getWallet: () => { throw new Error('must remain in focus effect'); } },
    '@/theme': { spacing: { sm: 8, md: 12, lg: 16 }, useTheme: () => ({ theme: { colors: {}, wallet: {} } }) },
  };
  const module = new Module(filename); module.filename = filename;
  module.require = name => Object.hasOwn(overrides, name) ? overrides[name] : require(name);
  module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return { html: renderToStaticMarkup(React.createElement(module.exports.UtilitiesScreen)), routes, wallet, section, promotion };
}
test('catalog follows Wallet before existing banner; Wallet actions survive catalog failure', () => {
  const result = render(true);
  assert.ok(result.html.indexOf('WALLET') < result.html.indexOf('CATALOG_ERROR_RETRY'));
  assert.ok(result.html.indexOf('CATALOG_ERROR_RETRY') < result.html.indexOf('FEATURED_BRANDS'));
  assert.ok(result.html.indexOf('FEATURED_BRANDS') < result.html.indexOf('Nhiều tiện ích'));
  assert.ok(result.html.indexOf('CATALOG_ERROR_RETRY') < result.html.indexOf('Nhiều tiện ích'));
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
