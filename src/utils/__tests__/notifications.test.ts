/**
 * notifications.ts ユニットテスト
 */
import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { checkExpiryAlerts, getAlertSummary } from '../notifications';
import { StockItem } from '../../types';

const makeItem = (overrides: Partial<StockItem> = {}): StockItem => ({
  id: 1,
  name: 'テスト食品',
  sec: 'staple',
  qty: 1,
  kcal: 500,
  waterL: 0,
  expiry: '2027-12-31',
  loc: '',
  ...overrides,
});

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

describe('checkExpiryAlerts', () => {
  it('空配列は空のアラートを返す', () => {
    const alerts = checkExpiryAlerts([]);
    assert.equal(alerts.length, 0);
  });

  it('期限切れアイテムはexpiredレベル', () => {
    const items = [makeItem({ expiry: daysFromNow(-5) })];
    const alerts = checkExpiryAlerts(items);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].level, 'expired');
    assert.ok(alerts[0].message.includes('期限が切れています'));
  });

  it('7日以内はurgentレベル', () => {
    const items = [makeItem({ expiry: daysFromNow(3) })];
    const alerts = checkExpiryAlerts(items);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].level, 'urgent');
    assert.ok(alerts[0].message.includes('早めに消費'));
  });

  it('30日以内はwarningレベル', () => {
    const items = [makeItem({ expiry: daysFromNow(20) })];
    const alerts = checkExpiryAlerts(items);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].level, 'warning');
  });

  it('90日以内はnoticeレベル（maxLevel指定時）', () => {
    const items = [makeItem({ expiry: daysFromNow(60) })];
    // デフォルトのmaxLevel='warning'ではnoticeは含まない
    const alertsDefault = checkExpiryAlerts(items);
    assert.equal(alertsDefault.length, 0);
    // maxLevel='notice'ならnoticeも含む
    const alertsNotice = checkExpiryAlerts(items, 'notice');
    assert.equal(alertsNotice.length, 1);
    assert.equal(alertsNotice[0].level, 'notice');
  });

  it('91日以上は通知なし', () => {
    const items = [makeItem({ expiry: daysFromNow(100) })];
    const alerts = checkExpiryAlerts(items, 'notice');
    assert.equal(alerts.length, 0);
  });

  it('9999-12-31（期限なし）はスキップ', () => {
    const items = [makeItem({ expiry: '9999-12-31' })];
    const alerts = checkExpiryAlerts(items, 'notice');
    assert.equal(alerts.length, 0);
  });

  it('緊急度順にソートされる', () => {
    const items = [
      makeItem({ id: 1, name: '余裕', expiry: daysFromNow(20) }),
      makeItem({ id: 2, name: '期限切れ', expiry: daysFromNow(-3) }),
      makeItem({ id: 3, name: '緊急', expiry: daysFromNow(5) }),
    ];
    const alerts = checkExpiryAlerts(items);
    assert.equal(alerts[0].level, 'expired');
    assert.equal(alerts[1].level, 'urgent');
    assert.equal(alerts[2].level, 'warning');
  });

  it('同レベル内は日数昇順', () => {
    const items = [
      makeItem({ id: 1, name: '5日後', expiry: daysFromNow(5) }),
      makeItem({ id: 2, name: '2日後', expiry: daysFromNow(2) }),
    ];
    const alerts = checkExpiryAlerts(items);
    assert.equal(alerts.length, 2);
    assert.ok(alerts[0].daysLeft <= alerts[1].daysLeft);
  });
});

describe('getAlertSummary', () => {
  it('各レベルのカウントが正しい', () => {
    const items = [
      makeItem({ id: 1, expiry: daysFromNow(-1) }),  // expired
      makeItem({ id: 2, expiry: daysFromNow(-3) }),  // expired
      makeItem({ id: 3, expiry: daysFromNow(3) }),   // urgent
      makeItem({ id: 4, expiry: daysFromNow(20) }),  // warning
    ];
    const alerts = checkExpiryAlerts(items);
    const summary = getAlertSummary(alerts);
    assert.equal(summary.expired, 2);
    assert.equal(summary.urgent, 1);
    assert.equal(summary.warning, 1);
    assert.equal(summary.total, 4);
  });

  it('アラートなしの場合は全て0', () => {
    const summary = getAlertSummary([]);
    assert.equal(summary.expired, 0);
    assert.equal(summary.urgent, 0);
    assert.equal(summary.warning, 0);
    assert.equal(summary.total, 0);
  });
});
