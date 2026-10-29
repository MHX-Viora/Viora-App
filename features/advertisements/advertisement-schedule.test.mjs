import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import path from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url), ts = require('typescript');
function load() {
  const file = path.resolve('features/advertisements/advertisement-schedule.ts');
  const mod = new Module(file);
  mod._compile(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
  return mod.exports;
}

test('local calendar dates survive month, year and leap-day boundaries', () => {
  const { localDateKey, addLocalDays, parseLocalDate } = load();
  assert.equal(localDateKey(new Date(2026, 9, 29, 0, 15)), '2026-10-29');
  assert.equal(addLocalDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addLocalDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addLocalDays('2026-10-31', 3), '2026-11-03');
  assert.equal(parseLocalDate('2026-02-30'), null);
  assert.equal(parseLocalDate('not-a-date'), null);
});

test('today starts immediately and future dates use local midnight with the billed duration', () => {
  const { createAdvertisementSchedule } = load();
  const now = new Date(2026, 9, 29, 15, 30);
  const today = createAdvertisementSchedule('2026-10-29', 3, now);
  assert.equal(today.startAt.getTime(), now.getTime());
  const future = createAdvertisementSchedule('2026-11-03', 7, now);
  assert.equal(future.startAt.getTime(), new Date(2026, 10, 3).getTime());
  assert.equal(future.endAt.getTime() - future.startAt.getTime(), 7 * 86400000);
  assert.equal(now.getHours(), 15);
});

test('submission rejects past dates, invalid dates and a selection that expired overnight', () => {
  const { createAdvertisementSchedule } = load();
  const now = new Date(2026, 9, 29, 0, 1);
  for (const date of ['2026-10-28', '2026-02-30', 'invalid']) {
    assert.throws(() => createAdvertisementSchedule(date, 3, now), RangeError);
  }
  assert.throws(() => createAdvertisementSchedule('2026-10-29', 3, new Date(2026, 9, 30)), RangeError);
});

test('calendar uses Monday-first weeks, includes every date and pads complete rows', () => {
  const { calendarMonthCells } = load();
  const cells = calendarMonthCells('2026-11-01');
  assert.equal(cells.length % 7, 0);
  assert.deepEqual(cells.slice(0, 6), Array(6).fill(null));
  assert.equal(cells[6], '2026-11-01');
  assert.equal(cells.filter(Boolean).length, 30);
  assert.equal(calendarMonthCells('2028-02-01').filter(Boolean).length, 29);
});

test('campaign duration is limited to whole days from 1 to 30', () => {
  const { createAdvertisementSchedule, normalizeAdvertisementDuration } = load();
  const now = new Date(2026, 9, 29, 12);
  for (const duration of [1, 30]) {
    const schedule = createAdvertisementSchedule('2026-10-29', duration, now);
    assert.equal(schedule.endAt - schedule.startAt, duration * 86400000);
  }
  for (const duration of [0, 31, 1.5, NaN]) assert.throws(() => createAdvertisementSchedule('2026-10-29', duration, now), RangeError);
  assert.equal(normalizeAdvertisementDuration(-5), 1);
  assert.equal(normalizeAdvertisementDuration(42), 30);
  assert.equal(normalizeAdvertisementDuration(12.6), 13);
});
