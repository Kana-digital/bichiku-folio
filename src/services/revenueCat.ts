/**
 * RevenueCat 連携サービス
 *
 * 📌 セットアップ完了:
 * 1. RevenueCat アカウント作成済み ✅
 * 2. Entitlement: "Bichiku Folio Pro" ✅
 * 3. Offering: Monthly / Yearly ✅
 * 4. Google Play Store 接続済み ✅ (com.bichikufolio.app)
 * 5. API Key 設定済み（Android本番 / iOSはApp Store登録後に差し替え） ✅
 * 6. Google Play Service Account JSON → RevenueCat 設定済み ✅
 * 7. Google Play Console にサービスアカウント招待済み ✅
 * 8. App Store 登録済み + iOS 本番 API Key 設定済み ✅
 *
 * 📌 パッケージインストール:
 *   npx expo install react-native-purchases
 *
 * 📌 使い方:
 *   useSubscription hook の purchase / restore メソッドで
 *   このモジュールの関数を呼び出す
 */

import { Platform } from 'react-native';
import { RC_ENTITLEMENT } from '../constants/plans';
import { logger } from '../utils/logger';

// ── 設定 ──
// iOS: App Store 本番キー設定済み ✅
// Android: Google Play Store 本番キー設定済み ✅
const API_KEY_IOS = 'appl_qFFCZvaNihMvTpmcMnMFQmvlqhJ';
const API_KEY_ANDROID = 'goog_nuKUVImUqftNBCdneJpnvOIfziP';

/** RevenueCat SDK が利用可能かどうか */
let isAvailable = false;
let Purchases: any = null;

/**
 * RevenueCat を初期化する
 * App.tsx の起動時に1回呼ぶ
 */
export async function initRevenueCat(): Promise<void> {
  try {
    // react-native-purchases が未インストールの場合はスキップ
    Purchases = require('react-native-purchases').default;
    const apiKey = Platform.OS === 'ios' ? API_KEY_IOS : API_KEY_ANDROID;

    if (apiKey.startsWith('YOUR_')) {
      logger.warn('[RevenueCat] API Key が未設定です。ローカルモードで動作します。');
      return;
    }

    await Purchases.configure({ apiKey });
    isAvailable = true;
    logger.log('[RevenueCat] 初期化完了');
  } catch (e) {
    logger.warn('[RevenueCat] SDK が見つかりません。ローカルモードで動作します。', e);
  }
}

/**
 * 現在の Offering を取得
 */
export async function getOfferings() {
  if (!isAvailable || !Purchases) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (e) {
    console.error('[RevenueCat] Offerings取得エラー:', e);
    return null;
  }
}

/**
 * パッケージを購入
 */
export async function purchasePackage(pkg: any): Promise<boolean> {
  if (!isAvailable || !Purchases) return false;
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return !!customerInfo.entitlements.active[RC_ENTITLEMENT];
  } catch (e: any) {
    if (!e.userCancelled) {
      console.error('[RevenueCat] 購入エラー:', e);
    }
    return false;
  }
}

/**
 * 購入を復元
 */
export async function restorePurchases(): Promise<boolean> {
  if (!isAvailable || !Purchases) return false;
  try {
    const customerInfo = await Purchases.restorePurchases();
    return !!customerInfo.entitlements.active[RC_ENTITLEMENT];
  } catch (e) {
    console.error('[RevenueCat] 復元エラー:', e);
    return false;
  }
}

/**
 * 現在のサブスクリプション状態を確認
 */
export async function checkSubscription(): Promise<{
  isPremium: boolean;
  expiresAt: string | null;
}> {
  if (!isAvailable || !Purchases) {
    return { isPremium: false, expiresAt: null };
  }
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[RC_ENTITLEMENT];
    return {
      isPremium: !!entitlement,
      expiresAt: entitlement?.expirationDate ?? null,
    };
  } catch (e) {
    console.error('[RevenueCat] 状態確認エラー:', e);
    return { isPremium: false, expiresAt: null };
  }
}

/** SDK利用可否を取得（initRevenueCat後に変わる） */
export function isRCAvailable(): boolean {
  return isAvailable;
}
