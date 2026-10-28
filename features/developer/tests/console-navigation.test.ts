import assert from 'node:assert/strict';
import test from 'node:test';
import { consoleActiveItem } from '../lib/console-navigation';

test('overview and app list select separate existing routes', () => {
  assert.equal(consoleActiveItem('/developers/console'), 'overview');
  assert.equal(consoleActiveItem('/developers/console/'), 'overview');
  assert.equal(consoleActiveItem('/developers/console/apps'), 'apps');
});
test('app detail and sandbox remain in My Apps navigation', () => {
  assert.equal(consoleActiveItem('/developers/console/apps/app_example'), 'apps');
  assert.equal(consoleActiveItem('/developers/console/apps/app_example/sandbox'), 'apps');
});
test('notifications select only notifications; settings are not a sidebar item', () => {
  assert.equal(consoleActiveItem('/developers/console/notifications'), 'notifications');
  assert.equal(consoleActiveItem('/developers/console/settings'), null);
  assert.equal(consoleActiveItem('/developers/login'), null);
});
