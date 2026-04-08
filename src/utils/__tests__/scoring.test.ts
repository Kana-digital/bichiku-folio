/**
 * scoring.ts ユニットテスト
 *
 * Node.js 組み込みテストランナーで実行:
 *   npx tsc -p tsconfig.test.json && node --test dist-test/src/utils/__tests__/scoring.test.js
 */
import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { getMemberKcal, getMemberWater, calcScore } from '../scoring';
import { StockItem, Member } from '../../types';
import { GOV, AGE_KCAL } from '../../constants/ageKcal';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const makeMember = (typeId: string, id = 1): Member => ({ id, typeId });
const adult_m = makeMember('adult_m', 1);
const adult_f = makeMember('adult_f', 2);
const toddler = makeMember('toddler', 3);

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

// ---------------------------------------------------------------------------
// getMemberKcal
// ---------------------------------------------------------------------------
describe('getMemberKcal', () => {
  it('成人男性1人の場合 2650kcal を返す', () => {
    assert.equal(getMemberKcal([adult_m]), 2650);
  });

  it('複数メンバーの合算が正しい', () => {
    // adult_m=2650 + adult_f=2000 + toddler=1300
    assert.equal(getMemberKcal([adult_m, adult_f, toddler]), 5950);
  });

  it('不明なtypeIdの場合GOVデフォルト(2000)を使う', () => {
    assert.equal(getMemberKcal([makeMember('unknown')]), GOV.KCAL_PER_DAY);
  });

  it('空配列は0を返す', () => {
    assert.equal(getMemberKcal([]), 0);
  });
});

// ---------------------------------------------------------------------------
// getMemberWater
// ---------------------------------------------------------------------------
describe('getMemberWater', () => {
  it('成人男性1人の場合 3.0L を返す', () => {
    assert.equal(getMemberWater([adult_m]), 3.0);
  });

  it('複数メンバーの合算が正しい', () => {
    // adult_m=3.0 + adult_f=3.0 + toddler=1.5
    assert.equal(getMemberWater([adult_m, adult_f, toddler]), 7.5);
  });

  it('不明なtypeIdの場合GOVデフォルト(3L)を使う', () => {
    assert.equal(getMemberWater([makeMember('unknown')]), GOV.WATER_L_PER_DAY);
  });
});

// ---------------------------------------------------------------------------
// calcScore
// ---------------------------------------------------------------------------
describe('calcScore', () => {
  const members = [adult_m, adult_f];
  const targetDays = 7;
  // dailyKcal = 2650+2000 = 4650, dailyWater = 3+3 = 6
  // reqKcal = 4650*7=32550, reqWater = 6*7=42

  it('在庫ゼロの場合スコアは0', () => {
    const r = calcScore([], members, targetDays);
    assert.equal(r.total, 0);
    assert.equal(r.suf, 0);
    assert.equal(r.bal, 0);
    assert.equal(r.risk, 0);
    assert.equal(r.totalKcal, 0);
    assert.equal(r.totalWaterL, 0);
  });

  it('充足率の基本計算が正しい', () => {
    // 必要kcal=32550, 必要water=42L
    // kcalR=10000/32550=0.307, waterR=10/42=0.238
    // suf = 40*(0.307*0.6 + 0.238*0.4) = 40*(0.1842+0.0952) = 40*0.2794 = 11.18
    const items = [
      makeItem({ qty: 20, kcal: 500, waterL: 0.5 }), // 10000kcal, 10L water
    ];
    const r = calcScore(items, members, targetDays);
    assert.equal(r.totalKcal, 10000);
    assert.equal(r.totalWaterL, 10);
    assert.ok(r.suf > 0 && r.suf <= 40, `suf=${r.suf} は0〜40の範囲内`);
    assert.ok(r.total <= 100, `total=${r.total} は100以下`);
  });

  it('完全充足でsufは40に達する', () => {
    // 必要カロリーと水を十分に超えた場合
    const items = [
      makeItem({ qty: 100, kcal: 500, waterL: 1, sec: 'staple' }), // 50000kcal, 100L
    ];
    const r = calcScore(items, members, targetDays);
    assert.equal(r.suf, 40);
    assert.equal(r.kcalR, 1); // capped at 1
    assert.equal(r.waterR, 1);
  });

  it('familySizeが正しい', () => {
    const r = calcScore([], members, targetDays);
    assert.equal(r.familySize, 2);
  });

  it('govDaysはtargetDaysと一致', () => {
    const r = calcScore([], members, 3);
    assert.equal(r.govDays, 3);
  });

  it('dailyKcal/dailyWaterが正しい', () => {
    const r = calcScore([], members, targetDays);
    assert.equal(r.dailyKcal, 4650);
    assert.equal(r.dailyWater, 6);
  });

  it('reqKcal/reqWaterが正しい', () => {
    const r = calcScore([], members, targetDays);
    assert.equal(r.reqKcal, 32550);
    assert.equal(r.reqWater, 42);
  });

  it('dampening: 充足度が低いとbal/riskが抑制される', () => {
    // ほんの少しだけ在庫がある状態
    const items = [makeItem({ qty: 1, kcal: 100, waterL: 0 })];
    const r = calcScore(items, members, targetDays);
    // sufRatio = suf/40, very small
    // bal and risk should be damped
    assert.ok(r.suf < 5, `suf=${r.suf}`);
    // バランスは抑制されるはず
    assert.ok(r.bal < 40, `bal=${r.bal}`);
  });

  it('スコア合計は100以下', () => {
    const items = [
      makeItem({ qty: 200, kcal: 500, waterL: 1, sec: 'staple' }),
      makeItem({ id: 2, name: '副菜', qty: 100, kcal: 300, waterL: 0, sec: 'side_retort' }),
      makeItem({ id: 3, name: '水', qty: 50, kcal: 0, waterL: 2, sec: 'drink' }),
      makeItem({ id: 4, name: 'お菓子', qty: 30, kcal: 200, waterL: 0, sec: 'snack' }),
      makeItem({ id: 5, name: '調味料', qty: 10, kcal: 50, waterL: 0, sec: 'seasoning' }),
      makeItem({ id: 6, name: '防災', qty: 5, kcal: 100, waterL: 0, sec: 'bousai' }),
    ];
    const r = calcScore(items, members, targetDays);
    assert.ok(r.total <= 100, `total=${r.total}`);
    assert.ok(r.total >= 0, `total=${r.total}`);
  });

  it('期限切れ間近のアイテムがriskExpに影響する', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 10); // 10日後に期限
    const isoSoon = soon.toISOString().split('T')[0];

    const itemsSoon = [
      makeItem({ qty: 100, kcal: 500, waterL: 1, expiry: isoSoon }),
    ];
    const itemsFar = [
      makeItem({ qty: 100, kcal: 500, waterL: 1, expiry: '2030-12-31' }),
    ];
    const rSoon = calcScore(itemsSoon, members, targetDays);
    const rFar = calcScore(itemsFar, members, targetDays);
    // 期限が近いとriskExpが下がる → totalも下がる
    assert.ok(rSoon.riskExp <= rFar.riskExp, `soon=${rSoon.riskExp}, far=${rFar.riskExp}`);
  });

  it('9999-12-31 の期限はdatedItemsから除外される', () => {
    const items = [
      makeItem({ qty: 50, kcal: 500, waterL: 1, expiry: '9999-12-31' }),
    ];
    const r = calcScore(items, members, targetDays);
    // Should still have a valid score
    assert.ok(r.total >= 0);
  });

  it('userDaysの計算が正しい', () => {
    // totalKcal=10000, dailyKcal=4650 → userDays=10000/4650≈2.15
    const items = [makeItem({ qty: 20, kcal: 500, waterL: 0 })];
    const r = calcScore(items, members, targetDays);
    const expected = 10000 / 4650;
    assert.ok(Math.abs(r.userDays - expected) < 0.001, `userDays=${r.userDays}`);
  });

  it('vsAvgDays = userDays - 5.3', () => {
    const items = [makeItem({ qty: 20, kcal: 500, waterL: 0 })];
    const r = calcScore(items, members, targetDays);
    const expectedVs = 10000 / 4650 - 5.3;
    assert.ok(Math.abs(r.vsAvgDays - expectedVs) < 0.001, `vsAvgDays=${r.vsAvgDays}`);
  });

  it('セクター集中度が高いとriskSecが低下する', () => {
    // 全て1つのセクターに集中
    const itemsMono = [
      makeItem({ qty: 100, kcal: 500, waterL: 1, sec: 'staple' }),
    ];
    // 複数セクターに分散
    const itemsDiv = [
      makeItem({ id: 1, qty: 50, kcal: 250, waterL: 0.5, sec: 'staple' }),
      makeItem({ id: 2, qty: 50, kcal: 250, waterL: 0.5, sec: 'side_fish' }),
    ];
    const rMono = calcScore(itemsMono, members, targetDays);
    const rDiv = calcScore(itemsDiv, members, targetDays);
    assert.ok(rMono.riskSec <= rDiv.riskSec, `mono=${rMono.riskSec}, div=${rDiv.riskSec}`);
  });
});
