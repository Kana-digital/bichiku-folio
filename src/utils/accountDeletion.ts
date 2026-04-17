/**
 * アカウント削除フロー
 *
 * App Store Guideline 5.1.1(v) 対応:
 * アプリ内からアカウントを完全削除できるようにする。
 *
 * 削除手順:
 *   1. 参加している家族グループから脱退（最後の1人なら全データ削除）
 *   2. AsyncStorage のアプリデータを全クリア
 *   3. Firebase Auth のユーザーを削除
 *      → requires-recent-login エラーが返ったら再認証が必要
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAccount, reauthenticateWithEmail } from '../services/authService';
import { purgeUserFromAllFamilies } from '../services/familyService';
import { logger } from './logger';

// useStore.ts と同期が必要なキー一覧
const APP_STORAGE_KEYS = [
  'bichiku_items',
  'bichiku_members',
  'bichiku_region',
  'bichiku_onboarded',
  'bichiku_subscription',
  'bichiku_ad_state',
  'bichiku_family_id',
];

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
  /** 再認証が必要（匿名→メール紐付けしてからしばらく経ったユーザー） */
  requiresReauth?: boolean;
}

/** AsyncStorage のアプリ関連データを全クリア */
export async function clearLocalStorage(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(APP_STORAGE_KEYS);
    logger.log('[AccountDeletion] AsyncStorage クリア完了');
  } catch (e) {
    console.error('[AccountDeletion] AsyncStorage クリアエラー:', e);
  }
}

/**
 * アカウント削除フローのメイン処理
 *
 * 呼び出し順:
 *   1. purgeUserFromAllFamilies — Firestore上の家族グループから脱退
 *   2. clearLocalStorage — ローカルデータ全削除
 *   3. deleteAccount — Firebase Auth ユーザー削除
 *
 * 再認証が必要な場合は { success: false, requiresReauth: true } を返す。
 * その場合、家族脱退とローカルデータ削除は既に実行済みなので、
 * 呼び出し側は再認証成功後に deleteAccount のみ再実行すれば良い。
 */
export async function deleteAccountFlow(): Promise<DeleteAccountResult> {
  try {
    // 1. 家族グループから脱退
    const familyResult = await purgeUserFromAllFamilies();
    if (!familyResult) {
      logger.warn('[AccountDeletion] 家族グループ脱退に失敗（続行）');
    }

    // 2. ローカルデータ削除
    await clearLocalStorage();

    // 3. Firebase Auth ユーザー削除
    const authResult = await deleteAccount();
    if (!authResult.success) {
      if (authResult.requiresReauth) {
        return { success: false, requiresReauth: true };
      }
      return { success: false, error: authResult.error ?? 'アカウント削除に失敗しました' };
    }

    logger.log('[AccountDeletion] アカウント削除フロー完了');
    return { success: true };
  } catch (e: any) {
    console.error('[AccountDeletion] deleteAccountFlow エラー:', e);
    return { success: false, error: 'アカウント削除中にエラーが発生しました' };
  }
}

/**
 * 再認証 → アカウント削除
 *
 * requires-recent-login エラーが返ったメール紐付けユーザー用。
 * 既に家族脱退とローカルデータ削除は実行済みなので、Auth 削除のみ実行。
 */
export async function reauthenticateAndDelete(
  email: string,
  password: string,
): Promise<DeleteAccountResult> {
  try {
    const reauthResult = await reauthenticateWithEmail(email, password);
    if (!reauthResult.success) {
      return { success: false, error: reauthResult.error ?? '再認証に失敗しました' };
    }

    const deleteResult = await deleteAccount();
    if (!deleteResult.success) {
      return { success: false, error: deleteResult.error ?? 'アカウント削除に失敗しました' };
    }

    logger.log('[AccountDeletion] 再認証 + 削除完了');
    return { success: true };
  } catch (e: any) {
    console.error('[AccountDeletion] reauthenticateAndDelete エラー:', e);
    return { success: false, error: '再認証中にエラーが発生しました' };
  }
}
