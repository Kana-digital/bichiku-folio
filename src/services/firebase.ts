/**
 * Firebase 初期化・共通エクスポート
 *
 * Firebase JS SDK（モジュラー v10）を使用。
 * Expo Go でもネイティブモジュール不要で動作する。
 *
 * 📌 遅延初期化: getAuth() / getDb() を呼び出した時点で初期化。
 *    firebase/auth はトップレベルで import しない（Metro + RN の問題回避）。
 */

import { initializeApp, getApps } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

// ── Firebase 設定 ──
export const firebaseConfig = {
  apiKey: 'AIzaSyCTWgcZfOzVsSrTAZLwXfFu65L3CVUQFRo',
  authDomain: 'bichiku-folio.firebaseapp.com',
  projectId: 'bichiku-folio',
  storageBucket: 'bichiku-folio.firebasestorage.app',
  messagingSenderId: '1084331751730',
  appId: '1:1084331751730:web:4fbeab8675372e6f4ebf2b',
  measurementId: 'G-VNJQ5BTTP3',
};

// ── シングルトン ──
let _app: any = null;
let _auth: any = null;
let _db: any = null;

function ensureApp() {
  if (!_app) {
    _app = getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApps()[0];
  }
  return _app;
}

/** Auth インスタンスを取得（遅延初期化） */
export function getAuth() {
  if (!_auth) {
    const app = ensureApp();
    const firebaseAuth = require('firebase/auth');

    // initializeAuth + AsyncStorage 永続化を試みる
    try {
      // getReactNativePersistence は RN ビルドのみに存在
      if (typeof firebaseAuth.getReactNativePersistence === 'function') {
        _auth = firebaseAuth.initializeAuth(app, {
          persistence: firebaseAuth.getReactNativePersistence(AsyncStorage),
        });
      } else {
        // ブラウザビルドにフォールバック（通常は到達しない）
        logger.warn('[Firebase] RN ビルドが読み込まれていません。getAuth フォールバック使用');
        _auth = firebaseAuth.getAuth(app);
      }
    } catch (e: any) {
      if (e?.message?.includes('already')) {
        // 既に初期化済み → getAuth で取得
        _auth = firebaseAuth.getAuth(app);
      } else {
        logger.warn('[Firebase] Auth 初期化エラー:', e?.message);
        _auth = firebaseAuth.getAuth(app);
      }
    }
  }
  return _auth;
}

/** Firestore インスタンスを取得（遅延初期化） */
export function getDb() {
  if (!_db) {
    const { getFirestore } = require('firebase/firestore');
    _db = getFirestore(ensureApp());
  }
  return _db;
}
