import { COLORS } from '../constants/colors';

export function daysUntil(d: string): number {
  const target = new Date(d).getTime();
  if (isNaN(target)) return 0;
  return Math.ceil((target - Date.now()) / 86400000);
}

export function statusColor(d: number): string {
  if (d <= 7) return COLORS.red;
  if (d <= 30) return COLORS.yellow;
  if (d <= 90) return COLORS.orange;
  return COLORS.green;
}

export function statusLabel(d: number): string {
  if (d <= 0) return '期限切れ';
  if (d <= 7) return 'そろそろ消費';
  if (d <= 30) return 'お早めに';
  if (d <= 90) return 'ストック中';
  return '余裕あり';
}

export function normalizeDigits(s: string): string {
  return s
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[^\d]/g, '');
}

export function parseExpiryInput(raw: string): string | null {
  const digits = normalizeDigits(raw);
  if (digits.length !== 8) return null;
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);
  if (+y < 2000 || +y > 2099) return null;
  if (+m < 1 || +m > 12) return null;
  if (+d < 1 || +d > 31) return null;
  return `${y}-${m}-${d}`;
}

export function formatExpiryDisplay(digits: string): string {
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return digits.slice(0, 4) + ' / ' + digits.slice(4);
  return digits.slice(0, 4) + ' / ' + digits.slice(4, 6) + ' / ' + digits.slice(6, 8);
}

export function toWareki(isoDate: string): string {
  const d = new Date(isoDate);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  let era: string;
  let ey: number;
  if (y >= 2019) {
    era = '令和';
    ey = y - 2018;
  } else if (y >= 1989) {
    era = '平成';
    ey = y - 1988;
  } else {
    era = '昭和';
    ey = y - 1925;
  }
  const yearStr = ey === 1 ? '元' : ey.toString();
  return `${era}${yearStr}年${m}月${day}日`;
}
