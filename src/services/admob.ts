/**
 * AdMob 広告サービス
 *
 * react-native-google-mobile-ads を使用。
 * Expo Go ではネイティブSDKが利用できないため、
 * SDKが見つからない場合はフォールバックモード（プレースホルダー表示）で動作する。
 *
 * 📌 セットアップ手順:
 * 1. Google AdMob (https://admob.google.com) でアカウント作成
 * 2. アプリを登録し App ID を取得
 * 3. 広告ユニットを作成:
 *    - インタースティシャル（画像広告用）
 *    - リワードインタースティシャル（動画広告用）
 * 4. app.json の androidAppId / iosAppId を本番値に差し替え
 * 5. 下記 AD_UNIT_IDS を本番値に差し替え
 * 6. EAS Build で Development Build を作成:
 *    npx eas build --platform ios --profile development
 *
 * 📌 テスト用広告ユニットID:
 * Google提供のテストIDを使うと、審査前でも広告が表示される。
 * 本番リリース前に必ず本番IDに差し替えること。
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { logger } from '../utils/logger';

/** Expo Go 上で動作しているか判定 */
const isExpoGo = Constants.appOwnership === 'expo';

// ── 広告ユニットID ──
// テスト用ID（Google公式）
// 本番リリース前に必ず差し替えること
// __DEV__ が true（開発時）はGoogleテストIDを使用
// 本番ビルドでは自動的に本番IDが使われる
const AD_UNIT_IDS = {
  interstitial: Platform.select({
    ios: __DEV__
      ? 'ca-app-pub-3940256099942544/4411468910'         // テスト用
      : 'ca-app-pub-1593750663073581/4689602975',        // 本番
    android: __DEV__
      ? 'ca-app-pub-3940256099942544/1033173712'         // テスト用
      : 'ca-app-pub-1593750663073581/4159081940',        // 本番 Android
  }) ?? '',
  rewardedInterstitial: Platform.select({
    ios: __DEV__
      ? 'ca-app-pub-3940256099942544/6978759866'         // テスト用
      : 'ca-app-pub-1593750663073581/9688776659',        // 本番
    android: __DEV__
      ? 'ca-app-pub-3940256099942544/5354046379'         // テスト用
      : 'ca-app-pub-1593750663073581/3283937798',        // 本番 Android
  }) ?? '',
};

/** SDKが利用可能か */
let sdkAvailable = false;

/** SDK参照キャッシュ */
let MobileAds: any = null;
let InterstitialAd: any = null;
let RewardedInterstitialAd: any = null;
let AdEventType: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;

/** 読み込み済みの広告インスタンス */
let loadedInterstitial: any = null;
let loadedRewarded: any = null;

/**
 * AdMob SDK を初期化
 * アプリ起動時に1回呼ぶ
 */
export async function initAdMob(): Promise<boolean> {
  // Expo Go ではネイティブモジュールが使えないため、即座にスキップ
  if (isExpoGo) {
    logger.log('[AdMob] Expo Go 検出 → プレースホルダーモードで動作します');
    return false;
  }
  try {
    const admob = require('react-native-google-mobile-ads');
    MobileAds = admob.default ?? admob.MobileAds;
    InterstitialAd = admob.InterstitialAd;
    RewardedInterstitialAd = admob.RewardedInterstitialAd;
    AdEventType = admob.AdEventType;
    RewardedAdEventType = admob.RewardedAdEventType;
    TestIds = admob.TestIds;

    // SDK初期化
    await MobileAds().initialize();

    sdkAvailable = true;
    logger.log('[AdMob] 初期化完了');

    // 最初の広告をプリロード
    preloadInterstitial();
    preloadRewarded();

    return true;
  } catch (e) {
    logger.warn(
      '[AdMob] SDK が見つかりません。プレースホルダーモードで動作します。',
      'EAS Development Build を使用してください。',
    );
    return false;
  }
}

// ── インタースティシャル（画像広告） ──

function preloadInterstitial() {
  if (!sdkAvailable || !InterstitialAd) return;
  try {
    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial, {
      requestNonPersonalizedAdsOnly: true,
    });
    ad.addAdEventListener(AdEventType.LOADED, () => {
      loadedInterstitial = ad;
      logger.log('[AdMob] インタースティシャル読み込み完了');
    });
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      loadedInterstitial = null;
      // 次の広告をプリロード
      preloadInterstitial();
    });
    ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
      logger.warn('[AdMob] インタースティシャル読み込みエラー:', error);
      loadedInterstitial = null;
      // 5秒後にリトライ
      setTimeout(preloadInterstitial, 5000);
    });
    ad.load();
  } catch (e) {
    logger.warn('[AdMob] インタースティシャル作成エラー:', e);
  }
}

/**
 * インタースティシャル広告を表示
 * @returns 表示成功したか
 */
export async function showInterstitial(): Promise<boolean> {
  if (!sdkAvailable || !loadedInterstitial) {
    logger.log('[AdMob] インタースティシャル未読み込み（フォールバック）');
    return false;
  }
  try {
    await loadedInterstitial.show();
    return true;
  } catch (e) {
    logger.warn('[AdMob] インタースティシャル表示エラー:', e);
    loadedInterstitial = null;
    preloadInterstitial();
    return false;
  }
}

// ── リワードインタースティシャル（動画広告） ──

function preloadRewarded() {
  if (!sdkAvailable || !RewardedInterstitialAd) return;
  try {
    const ad = RewardedInterstitialAd.createForAdRequest(
      AD_UNIT_IDS.rewardedInterstitial,
      { requestNonPersonalizedAdsOnly: true },
    );
    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      loadedRewarded = ad;
      logger.log('[AdMob] リワードインタースティシャル読み込み完了');
    });
    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      logger.log('[AdMob] リワード獲得');
    });
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      loadedRewarded = null;
      preloadRewarded();
    });
    ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
      logger.warn('[AdMob] リワード読み込みエラー:', error);
      loadedRewarded = null;
      setTimeout(preloadRewarded, 5000);
    });
    ad.load();
  } catch (e) {
    logger.warn('[AdMob] リワード作成エラー:', e);
  }
}

/**
 * リワードインタースティシャル広告（動画広告）を表示
 * @returns 表示成功したか
 */
export async function showRewardedInterstitial(): Promise<boolean> {
  if (!sdkAvailable || !loadedRewarded) {
    logger.log('[AdMob] リワード未読み込み（フォールバック）');
    return false;
  }
  try {
    await loadedRewarded.show();
    return true;
  } catch (e) {
    logger.warn('[AdMob] リワード表示エラー:', e);
    loadedRewarded = null;
    preloadRewarded();
    return false;
  }
}

// ── ユーティリティ ──

/** SDKが使える状態か */
export function isAdMobAvailable(): boolean {
  return sdkAvailable;
}

/** インタースティシャルが読み込み済みか */
export function isInterstitialReady(): boolean {
  return !!loadedInterstitial;
}

/** リワードが読み込み済みか */
export function isRewardedReady(): boolean {
  return !!loadedRewarded;
}

export { AD_UNIT_IDS };
