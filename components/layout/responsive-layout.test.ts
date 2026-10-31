import assert from 'node:assert/strict';
import test from 'node:test';
import { getFixedTopBarBackgroundLayout, getFixedTopBarLayout } from './responsive-layout';

test('native category tabs clear status bars and reserve matching content space', () => {
  for (const topInset of [0, 24, 44, 59]) {
    for (const mode of [{ categoryOnly: true }, { isArticle: true }, {}]) {
      const bar = getFixedTopBarLayout({ ...mode, isDesktopWeb: false, topInset });
      const background = getFixedTopBarBackgroundLayout({ barHeight: bar.height, isWeb: false, topInset });
      assert.equal(background.top, 0);
      assert.equal(background.paddingTop, topInset + 8);
      assert.equal(background.height, bar.height);
      assert.ok(background.top + background.paddingTop >= topInset + 8);
      const baseHeight = 'categoryOnly' in mode ? 55 : 'isArticle' in mode ? 175 : 131;
      assert.equal(bar.height, baseHeight + topInset + 8);
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
    assert.equal(bar.height, 63);
  }
  assert.equal(getFixedTopBarLayout({ categoryOnly: true, isDesktopWeb: true, useDesktopSideRails: true, topInset: 59 }).height, 0);
});
