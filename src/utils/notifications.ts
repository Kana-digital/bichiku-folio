/**
 * 期限通知ユーティリティ
 *
 * 備蓄アイテムの期限をチェックし、通知すべきアイテムを返す。
 * Expo Notifications が追加されれば、ここからプッシュ通知を送信できる。
 */
import { StockItem } from '../types';
import { daysUntil } from './date';

export interface ExpiryAlert {
  item: StockItem;
  daysLeft: number;
  level: 'expired' | 'urgent' | 'warning' | 'notice';
  message: string;
}

/**
 * 通知レベルの閾値（日数）
 */
const THRESHOLDS = {
  expired: 0,    // 期限切れ
  urgent: 7,     // 7日以内
  warning: 30,   // 30日以内
  notice: 90,    // 90日以内
} as const;

/**
 * アイテムの期限アラートレベルを判定する
 */
function getAlertLevel(daysLeft: number): ExpiryAlert['level'] | null {
  if (daysLeft <= THRESHOLDS.expired) return 'expired';
  if (daysLeft <= THRESHOLDS.urgent) return 'urgent';
  if (daysLeft <= THRESHOLDS.warning) return 'warning';
  if (daysLeft <= THRESHOLDS.notice) return 'notice';
  return null;
}

/**
 * アラートメッセージを生成する
 */
function buildMessage(item: StockItem, daysLeft: number, level: ExpiryAlert['level']): string {
  switch (level) {
    case 'expired':
      return `「${item.name}」の期限が切れています。消費または廃棄を検討してください。`;
    case 'urgent':
      return `「${item.name}」の期限まであと${daysLeft}日です。早めに消費してください。`;
    case 'warning':
      return `「${item.name}」の期限まであと${daysLeft}日です。消費計画を立てましょう。`;
    case 'notice':
      return `「${item.name}」の期限まであと${daysLeft}日です。`;
  }
}

/**
 * 全アイテムの期限をチェックし、通知対象を返す
 *
 * @param items 在庫アイテム一覧
 * @param maxLevel 返すアラートの最低レベル（デフォルト: 'warning'）
 * @returns 期限アラートの配列（緊急度の高い順）
 */
export function checkExpiryAlerts(
  items: StockItem[],
  maxLevel: ExpiryAlert['level'] = 'warning'
): ExpiryAlert[] {
  const levelPriority: Record<ExpiryAlert['level'], number> = {
    expired: 0,
    urgent: 1,
    warning: 2,
    notice: 3,
  };
  const maxPriority = levelPriority[maxLevel];

  const alerts: ExpiryAlert[] = [];

  for (const item of items) {
    // 期限なし（9999-12-31）はスキップ
    if (item.expiry === '9999-12-31') continue;

    const daysLeft = daysUntil(item.expiry);
    const level = getAlertLevel(daysLeft);

    if (level && levelPriority[level] <= maxPriority) {
      alerts.push({
        item,
        daysLeft,
        level,
        message: buildMessage(item, daysLeft, level),
      });
    }
  }

  // 緊急度順にソート（期限切れ→urgent→warning→notice、同レベル内は日数昇順）
  alerts.sort((a, b) => {
    const pa = levelPriority[a.level];
    const pb = levelPriority[b.level];
    if (pa !== pb) return pa - pb;
    return a.daysLeft - b.daysLeft;
  });

  return alerts;
}

/**
 * アラートのサマリー情報を返す
 */
export function getAlertSummary(alerts: ExpiryAlert[]): {
  expired: number;
  urgent: number;
  warning: number;
  total: number;
} {
  return {
    expired: alerts.filter((a) => a.level === 'expired').length,
    urgent: alerts.filter((a) => a.level === 'urgent').length,
    warning: alerts.filter((a) => a.level === 'warning').length,
    total: alerts.length,
  };
}
