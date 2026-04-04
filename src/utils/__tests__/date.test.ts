/**
 * date.ts ユニットテスト
 *
 * Node.js 組み込みテストランナーで実行:
 *   npx tsc -p tsconfig.test.json && node --test dist-test/src/utils/__tests__/date.test.js
 */
import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  daysUntil,
  statusColor,
  statusLabel,
  normalizeDigits,
  parseExpiryInput,
  formatExpiryDisplay,
  toWareki,
} from '../date';
import { COLORS } from '../../constants/colors';

// ---------------------------------------------------------------------------
// daysUntil
// ---------------------------------------------------------------------------
describe('daysUntil', () => {
  it('未来の日付は正の値を返す', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const iso = future.toISOString().split('T')[0];
    const d = daysUntil(iso);
    assert.ok(d >= 9 && d <= 11, `daysUntil=${d}`);
  });

  it('過去の日付は負の値を返す', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const iso = past.toISOString().split('T')[0];
    const d = daysUntil(iso);
    assert.ok(d <= -4 && d >= -6, `daysUntil=${d}`);
  });

  it('不正な日付文字列は0を返す', () => {
    assert.equal(daysUntil('invalid'), 0);
    assert.equal(daysUntil(''), 0);
  });

  it('今日の日付は0または1を返す', () => {
    const today = new Date().toISOString().split('T')[0];
    const d = daysUntil(today);
    assert.ok(d >= -1 && d <= 1, `today daysUntil=${d}`);
  });
});

// ---------------------------------------------------------------------------
// statusColor
// ---------------------------------------------------------------------------
describe('statusColor', () => {
  it('7日以内はred', () => {
    assert.equal(statusColor(0), COLORS.red);
    assert.equal(statusColor(7), COLORS.red);
  });

  it('8〜30日はyellow', () => {
    assert.equal(statusColor(8), COLORS.yellow);
    assert.equal(statusColor(30), COLORS.yellow);
  });

  it('31〜90日はorange', () => {
    assert.equal(statusColor(31), COLORS.orange);
    assert.equal(statusColor(90), COLORS.orange);
  });

  it('91日以上はgreen', () => {
    assert.equal(statusColor(91), COLORS.green);
    assert.equal(statusColor(365), COLORS.green);
  });
});

// ---------------------------------------------------------------------------
// statusLabel
// ---------------------------------------------------------------------------
describe('statusLabel', () => {
  it('0以下は「期限切れ」', () => {
    assert.equal(statusLabel(0), '期限切れ');
    assert.equal(statusLabel(-1), '期限切れ');
  });

  it('1〜7日は「そろそろ消費」', () => {
    assert.equal(statusLabel(1), 'そろそろ消費');
    assert.equal(statusLabel(7), 'そろそろ消費');
  });

  it('8〜30日は「お早めに」', () => {
    assert.equal(statusLabel(8), 'お早めに');
    assert.equal(statusLabel(30), 'お早めに');
  });

  it('31〜90日は「ストック中」', () => {
    assert.equal(statusLabel(31), 'ストック中');
    assert.equal(statusLabel(90), 'ストック中');
  });

  it('91日以上は「余裕あり」', () => {
    assert.equal(statusLabel(91), '余裕あり');
  });
});

// ---------------------------------------------------------------------------
// normalizeDigits
// ---------------------------------------------------------------------------
describe('normalizeDigits', () => {
  it('全角数字を半角に変換する', () => {
    assert.equal(normalizeDigits('２０２６'), '2026');
  });

  it('半角数字はそのまま', () => {
    assert.equal(normalizeDigits('2026'), '2026');
  });

  it('数字以外の文字は除去される', () => {
    assert.equal(normalizeDigits('2026年04月01日'), '20260401');
  });

  it('混在入力を正しく処理', () => {
    assert.equal(normalizeDigits('２０２６/04/０１'), '20260401');
  });
});

// ---------------------------------------------------------------------------
// parseExpiryInput
// ---------------------------------------------------------------------------
describe('parseExpiryInput', () => {
  it('8桁の日付文字列をISO形式に変換', () => {
    assert.equal(parseExpiryInput('20261231'), '2026-12-31');
  });

  it('全角入力も正しく変換', () => {
    assert.equal(parseExpiryInput('２０２６１２３１'), '2026-12-31');
  });

  it('区切り文字付きの入力も変換', () => {
    assert.equal(parseExpiryInput('2026/12/31'), '2026-12-31');
  });

  it('8桁でない場合はnullを返す', () => {
    assert.equal(parseExpiryInput('202612'), null);
    assert.equal(parseExpiryInput(''), null);
  });

  it('年が範囲外の場合はnullを返す', () => {
    assert.equal(parseExpiryInput('19991231'), null);
    assert.equal(parseExpiryInput('21001231'), null);
  });

  it('月が範囲外の場合はnullを返す', () => {
    assert.equal(parseExpiryInput('20261301'), null);
    assert.equal(parseExpiryInput('20260001'), null);
  });

  it('日が範囲外の場合はnullを返す', () => {
    assert.equal(parseExpiryInput('20261232'), null);
    assert.equal(parseExpiryInput('20261200'), null);
  });
});

// ---------------------------------------------------------------------------
// formatExpiryDisplay
// ---------------------------------------------------------------------------
describe('formatExpiryDisplay', () => {
  it('4桁以下はそのまま', () => {
    assert.equal(formatExpiryDisplay('2026'), '2026');
    assert.equal(formatExpiryDisplay('20'), '20');
  });

  it('5〜6桁は年/月区切り', () => {
    assert.equal(formatExpiryDisplay('202604'), '2026 / 04');
  });

  it('7〜8桁は年/月/日区切り', () => {
    assert.equal(formatExpiryDisplay('20260401'), '2026 / 04 / 01');
  });
});

// ---------------------------------------------------------------------------
// toWareki
// ---------------------------------------------------------------------------
describe('toWareki', () => {
  it('令和の日付を正しく変換', () => {
    assert.equal(toWareki('2026-04-01'), '令和8年4月1日');
  });

  it('令和元年を「元」と表記', () => {
    assert.equal(toWareki('2019-05-01'), '令和元年5月1日');
  });

  it('平成の日付を正しく変換', () => {
    assert.equal(toWareki('2018-12-31'), '平成30年12月31日');
  });

  it('平成元年を「元」と表記', () => {
    assert.equal(toWareki('1989-01-08'), '平成元年1月8日');
  });

  it('昭和の日付を正しく変換', () => {
    assert.equal(toWareki('1988-12-31'), '昭和63年12月31日');
  });
});
