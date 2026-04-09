/**
 * 家族グループサービス（Firestore）
 *
 * データ構造:
 *   families/{familyId}
 *     - inviteCode: string (6桁)
 *     - members: string[] (uid配列)
 *     - createdBy: string (uid)
 *     - createdAt: Timestamp
 *
 *   families/{familyId}/items/{itemId}
 *     - StockItem のフィールド + updatedBy, updatedAt
 *
 *   families/{familyId}/settings/main
 *     - members: Member[] (家族構成)
 *     - regionId: string
 *     - updatedBy, updatedAt
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { getDb } from './firebase';
import { getCurrentUid } from './authService';
import { StockItem, Member } from '../types';
import { logger } from '../utils/logger';

// ── 型定義 ──

export interface FamilyGroup {
  id: string;
  inviteCode: string;
  members: string[];
  createdBy: string;
}

// ── 招待コード生成 ──

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── 家族グループ CRUD ──

export async function createFamily(): Promise<FamilyGroup | null> {
  const uid = getCurrentUid();
  if (!uid) return null;

  try {
    const db = getDb();
    const familyRef = doc(collection(db, 'families'));
    const inviteCode = generateInviteCode();

    await setDoc(familyRef, {
      inviteCode,
      members: [uid],
      createdBy: uid,
      createdAt: serverTimestamp(),
    });

    logger.log('[Family] グループ作成:', familyRef.id, 'コード:', inviteCode);
    return { id: familyRef.id, inviteCode, members: [uid], createdBy: uid };
  } catch (e) {
    console.error('[Family] グループ作成エラー:', e);
    return null;
  }
}

export async function joinFamily(
  inviteCode: string,
): Promise<{ success: boolean; familyId?: string; error?: string }> {
  const uid = getCurrentUid();
  if (!uid) return { success: false, error: 'ログインしていません' };

  try {
    const db = getDb();
    const q = query(collection(db, 'families'), where('inviteCode', '==', inviteCode.toUpperCase().trim()));
    const snap = await getDocs(q);

    if (snap.empty) return { success: false, error: '招待コードが見つかりません' };

    const familyDoc = snap.docs[0];
    const data = familyDoc.data();

    if (data.members?.includes(uid)) return { success: false, error: '既にこのグループに参加しています' };
    if ((data.members?.length ?? 0) >= 10) return { success: false, error: 'グループの上限（10人）に達しています' };

    await updateDoc(familyDoc.ref, { members: arrayUnion(uid) });
    logger.log('[Family] グループ参加:', familyDoc.id);
    return { success: true, familyId: familyDoc.id };
  } catch (e) {
    console.error('[Family] グループ参加エラー:', e);
    return { success: false, error: 'グループへの参加に失敗しました' };
  }
}

export async function leaveFamily(familyId: string): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;

  try {
    const db = getDb();
    await updateDoc(doc(db, 'families', familyId), { members: arrayRemove(uid) });
    return true;
  } catch (e) {
    console.error('[Family] グループ脱退エラー:', e);
    return false;
  }
}

export async function getMyFamily(): Promise<FamilyGroup | null> {
  const uid = getCurrentUid();
  if (!uid) return null;

  try {
    const db = getDb();
    const q = query(collection(db, 'families'), where('members', 'array-contains', uid));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const d = snap.docs[0];
    const data = d.data();
    return { id: d.id, inviteCode: data.inviteCode, members: data.members ?? [], createdBy: data.createdBy };
  } catch (e) {
    console.error('[Family] グループ取得エラー:', e);
    return null;
  }
}

// ── 備蓄アイテム同期 ──

export function subscribeItems(
  familyId: string,
  callback: (items: StockItem[]) => void,
): () => void {
  const db = getDb();
  return onSnapshot(collection(db, 'families', familyId, 'items'), (snap) => {
    const items: StockItem[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: Number(d.id), name: data.name ?? '', sec: data.sec ?? '',
        qty: data.qty ?? 0, kcal: data.kcal ?? 0, waterL: data.waterL ?? 0,
        expiry: data.expiry ?? '', loc: data.loc ?? '',
      };
    });
    callback(items);
  });
}

export async function upsertItem(familyId: string, item: StockItem): Promise<void> {
  const uid = getCurrentUid();
  if (!uid) return;
  try {
    const db = getDb();
    await setDoc(doc(db, 'families', familyId, 'items', String(item.id)), {
      name: item.name, sec: item.sec, qty: item.qty, kcal: item.kcal,
      waterL: item.waterL, expiry: item.expiry, loc: item.loc,
      updatedBy: uid, updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('[Family] アイテム保存エラー:', e);
  }
}

export async function deleteItem(familyId: string, itemId: number): Promise<void> {
  try {
    const db = getDb();
    await deleteDoc(doc(db, 'families', familyId, 'items', String(itemId)));
  } catch (e) {
    console.error('[Family] アイテム削除エラー:', e);
  }
}

export async function uploadAllItems(familyId: string, items: StockItem[]): Promise<void> {
  const uid = getCurrentUid();
  if (!uid) return;
  try {
    const db = getDb();
    const batch = writeBatch(db);
    for (const item of items) {
      batch.set(doc(db, 'families', familyId, 'items', String(item.id)), {
        name: item.name, sec: item.sec, qty: item.qty, kcal: item.kcal,
        waterL: item.waterL, expiry: item.expiry, loc: item.loc,
        updatedBy: uid, updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    logger.log('[Family] 全アイテムアップロード完了:', items.length, '件');
  } catch (e) {
    console.error('[Family] アップロードエラー:', e);
  }
}

// ── 家族設定同期 ──

export async function saveFamilySettings(
  familyId: string, members: Member[], regionId: string,
): Promise<void> {
  const uid = getCurrentUid();
  if (!uid) return;
  try {
    const db = getDb();
    await setDoc(doc(db, 'families', familyId, 'settings', 'main'), {
      members, regionId, updatedBy: uid, updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('[Family] 設定保存エラー:', e);
  }
}

export function subscribeSettings(
  familyId: string,
  callback: (settings: { members: Member[]; regionId: string } | null) => void,
): () => void {
  const db = getDb();
  return onSnapshot(doc(db, 'families', familyId, 'settings', 'main'), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    const data = snap.data();
    callback({ members: data.members ?? [], regionId: data.regionId ?? 'general' });
  });
}
