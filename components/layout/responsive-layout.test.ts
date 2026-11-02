import assert from 'node:assert/strict';
import test from 'node:test';
import { getFeedCategoryHeaderLayout, getFixedTopBarBackgroundLayout, getFixedTopBarLayout } from './responsive-layout';

test('native background reaches the top while only category controls receive the safe inset', () => {
  for (const topInset of [0, 24, 44, 59]) {
    for (const mode of [{ categoryOnly: true }, { isArticle: true }, {}]) {
      const bar = getFixedTopBarLayout({ ...mode, isDesktopWeb: false, topInset });
      const background = getFixedTopBarBackgroundLayout({ barHeight: bar.height, isWeb: false, topInset });
      assert.equal(bar.paddingTop, 0);
      assert.equal(background.top, topInset > 0 ? -topInset : 0);
      assert.equal(background.paddingTop, 0);
      assert.equal(background.height + background.top, bar.height);
      const tabs = getFeedCategoryHeaderLayout({ isWeb: false, topInset });
      assert.ok(tabs);
      assert.equal(tabs.paddingTop, topInset);
      assert.equal(tabs.height, topInset + 50);
      assert.equal(tabs.paddingBottom, 8);
      const baseHeight = 'categoryOnly' in mode ? 50 : 'isArticle' in mode ? 170 : 126;
      assert.equal(bar.height, baseHeight + topInset);
    }
  }
});

test('web header geometry stays unchanged and invalid insets do not shift layout', () => {
  for (const topInset of [24, 59, NaN, -10]) {
    const bar = getFixedTopBarLayout({ categoryOnly: true, isCompactWeb: true, isDesktopWeb: false, topInset });
    assert.equal(bar.height, 50);
    assert.deepEqual(getFixedTopBarBackgroundLayout({ barHeight: bar.height, isWeb: true, topInset }), { height: 50, paddingTop: 0, top: 0 });
  }
  for (const topInset of [NaN, -10, Infinity]) {
    const bar = getFixedTopBarLayout({ categoryOnly: true, isDesktopWeb: false, topInset });
    assert.equal(bar.height, 50);
    assert.deepEqual(getFeedCategoryHeaderLayout({ isWeb: false, topInset }), { height: 50, paddingTop: 0, paddingBottom: 8 });
  }
  assert.equal(getFeedCategoryHeaderLayout({ isWeb: true, topInset: 59 }), null);
  assert.equal(getFixedTopBarLayout({ categoryOnly: true, isDesktopWeb: true, useDesktopSideRails: true, topInset: 59 }).height, 0);
});
