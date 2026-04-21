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
  if (!isAvailable || !Purchases) {
    logger.error('[RevenueCat] SDK未初期化のためOffering取得不可');
    return null;
  }
  try {
    const offerings = await Purchases.getOfferings();
    if (!offerings.current) {
      logger.error('[RevenueCat] current offeringが見つかりません');
      return null;
    }
    logger.log(`[RevenueCat] Offering取得成功: ${offerings.current.availablePackages.length}パッケージ`);
    offerings.current.availablePackages.forEach((pkg: any) => {
      logger.log(`  - ${pkg.identifier} (${pkg.packageType}): ${pkg.product?.priceString ?? 'N/A'}`);
    });
    return offerings.current;
  } catch (e) {
    logger.error('[RevenueCat] Offerings取得エラー:', e);
    return null;
  }
}

/**
 * パッケージを購入
 */
export async function purchasePackage(pkg: any): Promise<boolean> {
  if (!isAvailable || !Purchases) {
    logger.error('[RevenueCat] SDK未初期化のため購入できません');
    return false;
  }
  try {
    logger.log(`[RevenueCat] 購入開始: ${pkg.identifier}`);
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const hasEntitlement = !!customerInfo.entitlements.active[RC_ENTITLEMENT];
    logger.log(`[RevenueCat] 購入結果: entitlement=${hasEntitlement}`);
    if (!hasEntitlement) {
      // エンタイトルメント名が異なる場合のフォールバック
      const activeKeys = Object.keys(customerInfo.entitlements.active);
      logger.log(`[RevenueCat] アクティブなentitlements: ${activeKeys.join(', ')}`);
      if (activeKeys.length > 0) {
        logger.log('[RevenueCat] 別名のentitlementがアクティブ → 成功として扱う');
        return true;
      }
    }
    return hasEntitlement;
  } catch (e: any) {
    if (e.userCancelled) {
      logger.log('[RevenueCat] ユーザーがキャンセル');
    } else {
      logger.error('[RevenueCat] 購入エラー:', e);
      logger.error('[RevenueCat] エラーコード:', e.code, 'メッセージ:', e.message);
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
    const hasEntitlement = !!customerInfo.entitlements.active[RC_ENTITLEMENT];
    if (hasEntitlement) return true;
    // フォールバック: entitlement名が異なる場合でも、何かアクティブなものがあれば成功
    const activeKeys = Object.keys(customerInfo.entitlements.active);
    if (activeKeys.length > 0) {
      logger.log(`[RevenueCat] 復元: 別名のentitlementがアクティブ (${activeKeys.join(', ')}) → 成功`);
      return true;
    }
    return false;
  } catch (e) {
    logger.error('[RevenueCat] 復元エラー:', e);
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
    if (entitlement) {
      return { isPremium: true, expiresAt: entitlement.expirationDate ?? null };
    }
    // フォールバック: entitlement名が異なる場合
    const activeKeys = Object.keys(customerInfo.entitlements.active);
    if (activeKeys.length > 0) {
      const firstActive = customerInfo.entitlements.active[activeKeys[0]];
      logger.log(`[RevenueCat] 状態確認: 別名のentitlement (${activeKeys.join(', ')}) がアクティブ`);
      return { isPremium: true, expiresAt: firstActive?.expirationDate ?? null };
    }
    return { isPremium: false, expiresAt: null };
  } catch (e) {
    logger.error('[RevenueCat] 状態確認エラー:', e);
    return { isPremium: false, expiresAt: null };
  }
}

/** SDK利用可否を取得（initRevenueCat後に変わる） */
export function isRCAvailable(): boolean {
  return isAvailable;
}
