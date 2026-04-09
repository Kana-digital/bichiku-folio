/**
 * Expo Push Notifications サービス
 *
 * 期限アラートをローカル通知として配信する。
 * バックグラウンドタスクは不要（アプリ起動時にチェック）。
 *
 * 📌 必要パッケージ:
 *   npx expo install expo-notifications expo-device expo-constants
 */

import { Platform } from 'react-native';
import { StockItem } from '../types';
import { checkExpiryAlerts, ExpiryAlert } from '../utils/notifications';
import { logger } from '../utils/logger';

let Notifications: any = null;
let Device: any = null;
let isAvailable = false;

/**
 * 通知パーミッションの取得と初期化
 * App起動時に1回呼ぶ
 */
export async function initNotifications(): Promise<boolean> {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');

    // 実機でのみ通知を有効にする
    if (!Device.isDevice) {
      logger.log('[Notifications] シミュレーターでは通知をスキップ');
      return false;
    }

    // 通知チャンネル設定（Android）
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('expiry-alerts', {
        name: '期限アラート',
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      });
    }

    // パーミッション確認・リクエスト
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.log('[Notifications] 通知が許可されていません');
      return false;
    }

    // 通知ハンドラー設定（アプリがフォアグラウンドの時も表示）
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    isAvailable = true;
    logger.log('[Notifications] 初期化完了');
    return true;
  } catch (e) {
    logger.warn('[Notifications] SDK が見つかりません:', e);
    return false;
  }
}

/**
 * 期限アラートのローカル通知をスケジュールする
 *
 * 既存の期限通知をすべてキャンセルしてから再スケジュール。
 * アプリ起動時・アイテム更新時に呼ぶ。
 */
export async function scheduleExpiryNotifications(items: StockItem[]): Promise<number> {
  if (!isAvailable || !Notifications) return 0;

  try {
    // 既存の通知をすべてキャンセル
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 期限アラートを取得（notice レベルまで含む）
    const alerts = checkExpiryAlerts(items, 'notice');

    let scheduled = 0;

    for (const alert of alerts) {
      // 既に期限切れのものは即時通知
      if (alert.level === 'expired') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ 期限切れ',
            body: alert.message,
            data: { itemId: alert.item.id },
            ...(Platform.OS === 'android' && { channelId: 'expiry-alerts' }),
          },
          trigger: null, // 即時
        });
        scheduled++;
        continue;
      }

      // urgent（7日以内）: 毎朝9時に通知
      if (alert.level === 'urgent') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🔴 もうすぐ期限切れ',
            body: alert.message,
            data: { itemId: alert.item.id },
            ...(Platform.OS === 'android' && { channelId: 'expiry-alerts' }),
          },
          trigger: {
            type: 'daily',
            hour: 9,
            minute: 0,
          } as any,
        });
        scheduled++;
        continue;
      }

      // warning（30日以内）: 7日前に1回通知
      if (alert.level === 'warning' && alert.daysLeft > 7) {
        const triggerDate = new Date();
        triggerDate.setDate(triggerDate.getDate() + (alert.daysLeft - 7));
        triggerDate.setHours(9, 0, 0, 0);

        if (triggerDate > new Date()) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🟡 期限が近づいています',
              body: alert.message,
              data: { itemId: alert.item.id },
              ...(Platform.OS === 'android' && { channelId: 'expiry-alerts' }),
            },
            trigger: { type: 'date', date: triggerDate } as any,
          });
          scheduled++;
        }
      }
    }

    logger.log(`[Notifications] ${scheduled}件の通知をスケジュール`);
    return scheduled;
  } catch (e) {
    console.error('[Notifications] スケジュールエラー:', e);
    return 0;
  }
}

/**
 * バッジ数を期限切れ/urgentアイテム数に設定
 */
export async function updateBadgeCount(items: StockItem[]): Promise<void> {
  if (!isAvailable || !Notifications) return;
  try {
    const alerts = checkExpiryAlerts(items, 'urgent');
    const count = alerts.filter(a => a.level === 'expired' || a.level === 'urgent').length;
    await Notifications.setBadgeCountAsync(count);
  } catch (e) {
    // バッジ更新失敗は無視
  }
}

export { isAvailable as isNotificationsAvailable };
