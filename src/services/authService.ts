/**
 * 認証サービス
 *
 * Firebase Anonymous Auth を使用。
 * firebase/auth はトップレベルで import しない（RN ランタイム問題回避）。
 */

import { getAuth } from './firebase';
import { logger } from '../utils/logger';

function fb() {
  return require('firebase/auth');
}

/** 匿名サインイン */
export async function signInAnon(): Promise<any> {
  try {
    const auth = getAuth();
    if (auth.currentUser) {
      logger.log('[Auth] 既存ユーザー:', auth.currentUser.uid);
      return auth.currentUser;
    }
    const result = await fb().signInAnonymously(auth);
    logger.log('[Auth] 匿名サインイン成功:', result.user.uid);
    return result.user;
  } catch (e) {
    console.error('[Auth] 匿名サインインエラー:', e);
    return null;
  }
}

/** メールアドレス+パスワードを匿名アカウントに紐付け */
export async function linkEmail(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'ログインしていません' };
    if (!user.isAnonymous) return { success: false, error: '既にメールアドレスが紐付けられています' };

    const { linkWithCredential, EmailAuthProvider } = fb();
    const credential = EmailAuthProvider.credential(email, password);
    await linkWithCredential(user, credential);
    return { success: true };
  } catch (e: any) {
    const code = e?.code ?? '';
    if (code === 'auth/email-already-in-use') return { success: false, error: 'このメールアドレスは既に使用されています' };
    if (code === 'auth/weak-password') return { success: false, error: 'パスワードは6文字以上にしてください' };
    if (code === 'auth/invalid-email') return { success: false, error: 'メールアドレスの形式が正しくありません' };
    return { success: false, error: 'メール紐付けに失敗しました' };
  }
}

/** 認証状態の監視 */
export function observeAuth(callback: (user: any) => void): () => void {
  return fb().onAuthStateChanged(getAuth(), callback);
}

/** 現在のユーザーを取得 */
export function getCurrentUser(): any {
  return getAuth().currentUser;
}

/** 現在のユーザー UID を取得 */
export function getCurrentUid(): string | null {
  return getAuth().currentUser?.uid ?? null;
}

/** サインアウト */
export async function signOutUser(): Promise<void> {
  try {
    await fb().signOut(getAuth());
  } catch (e) {
    console.error('[Auth] サインアウトエラー:', e);
  }
}

/** メール+パスワードで再認証（delete 前に必要になる場合あり） */
export async function reauthenticateWithEmail(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    const user = getAuth().currentUser;
    if (!user) return { success: false, error: 'ログインしていません', code: 'no-current-user' };
    const { EmailAuthProvider, reauthenticateWithCredential } = fb();
    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(user, credential);
    return { success: true };
  } catch (e: any) {
    const code = e?.code ?? '';
    if (code === 'auth/wrong-password') return { success: false, error: 'パスワードが間違っています', code };
    if (code === 'auth/invalid-email') return { success: false, error: 'メールアドレスの形式が正しくありません', code };
    if (code === 'auth/user-mismatch') return { success: false, error: '別のアカウントのメールアドレスです', code };
    return { success: false, error: '再認証に失敗しました', code };
  }
}

/** Firebase Auth からユーザーを削除 */
export async function deleteAccount(): Promise<{
  success: boolean;
  error?: string;
  requiresReauth?: boolean;
}> {
  try {
    const user = getAuth().currentUser;
    if (!user) return { success: false, error: 'ログインしていません' };
    const { deleteUser } = fb();
    await deleteUser(user);
    logger.log('[Auth] アカウント削除完了');
    return { success: true };
  } catch (e: any) {
    const code = e?.code ?? '';
    if (code === 'auth/requires-recent-login') {
      return { success: false, error: '再度ログインが必要です', requiresReauth: true };
    }
    console.error('[Auth] アカウント削除エラー:', e);
    return { success: false, error: 'アカウントの削除に失敗しました' };
  }
}
