import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StockItem, Member } from '../types';
import { DEFAULT_MEMBERS } from '../constants/ageKcal';
import { logger } from '../utils/logger';

const ITEMS_KEY = 'bichiku_items';
const MEMBERS_KEY = 'bichiku_members';
const REGION_KEY = 'bichiku_region';
const ONBOARDED_KEY = 'bichiku_onboarded';
const FAMILY_ID_KEY = 'bichiku_family_id';

// ── 旧セクターID マイグレーション ──
// v1.0 以前の "side" を商品名に基づいて4セクターに振り分け
const FISH_KW = ['ツナ', 'シーチキン', 'サバ', 'さば', 'イワシ', 'いわし', 'サンマ', 'さんま', '鮭', 'サーモン', '魚'];
const MEAT_KW = ['焼き鳥', 'コンビーフ', 'スパム', 'ウインナー', 'チキン', '鶏', '牛', '豚', '肉'];
const RETORT_KW = ['カレー', 'シチュー', '牛丼', '親子丼', 'レトルト', 'どんぶり', '丼', 'パスタソース', 'ミートソース', '中華丼', '麻婆'];

function migrateSectorId(sec: string, name: string): string {
  if (sec !== 'side') return sec;
  const n = name.toLowerCase();
  if (FISH_KW.some((kw) => n.includes(kw.toLowerCase()))) return 'side_fish';
  if (MEAT_KW.some((kw) => n.includes(kw.toLowerCase()))) return 'side_meat';
  if (RETORT_KW.some((kw) => n.includes(kw.toLowerCase()))) return 'side_retort';
  // デフォルトはレトルト食品（最も汎用的なカテゴリ）
  return 'side_retort';
}

// ── 遅延 import（firebase/auth のモジュール評価を避けるため） ──
function getAuthService() {
  return require('../services/authService');
}
function getFamilyService() {
  return require('../services/familyService');
}

export function useStore() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [members, setMembers] = useState<Member[]>(DEFAULT_MEMBERS);
  const [regionId, setRegionId] = useState<string>('nankai');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);

  // ── Firebase / 家族同期 ──
  const [uid, setUid] = useState<string | null>(null);
  const [family, setFamily] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const unsubItemsRef = useRef<(() => void) | null>(null);
  const unsubSettingsRef = useRef<(() => void) | null>(null);

  // ── ローカルデータ読み込み ──
  useEffect(() => {
    loadLocalData();
  }, []);

  // ── 認証初期化（遅延: RN ランタイム準備完了後に実行） ──
  useEffect(() => {
    let unsubAuth: (() => void) | null = null;
    const timer = setTimeout(() => {
      try {
        const { observeAuth, signInAnon } = getAuthService();
        unsubAuth = observeAuth((user: any) => {
          setUid(user?.uid ?? null);
        });
        signInAnon();
      } catch (e) {
        logger.warn('[useStore] Firebase 認証初期化スキップ:', e);
      }
    }, 500); // RN ランタイム準備待ち

    return () => {
      clearTimeout(timer);
      unsubAuth?.();
    };
  }, []);

  // ── 家族グループの検出・リアルタイム同期開始 ──
  useEffect(() => {
    if (!uid) return;
    checkAndSubscribeFamily();
  }, [uid]);

  const loadLocalData = useCallback(async () => {
    try {
      const [itemsData, membersData, regionData, onboardedData] = await Promise.all([
        AsyncStorage.getItem(ITEMS_KEY),
        AsyncStorage.getItem(MEMBERS_KEY),
        AsyncStorage.getItem(REGION_KEY),
        AsyncStorage.getItem(ONBOARDED_KEY),
      ]);

      setIsOnboarded(onboardedData === 'true');

      if (itemsData) {
        const parsed = JSON.parse(itemsData);
        if (Array.isArray(parsed)) {
          setItems(
            parsed
              .filter((i: any) => i && typeof i.id === 'number' && typeof i.name === 'string')
              .map((i: any) => ({
                ...i,
                sec: migrateSectorId(typeof i.sec === 'string' ? i.sec : 'staple', i.name ?? ''),
                qty: typeof i.qty === 'number' && !isNaN(i.qty) ? i.qty : 0,
                kcal: typeof i.kcal === 'number' && !isNaN(i.kcal) ? i.kcal : 0,
                waterL: typeof i.waterL === 'number' && !isNaN(i.waterL) ? i.waterL : 0,
                expiry: typeof i.expiry === 'string' ? i.expiry : '9999-12-31',
                loc: typeof i.loc === 'string' ? i.loc : 'パントリー',
              }))
          );
        }
      }
      if (membersData) {
        const parsed = JSON.parse(membersData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMembers(parsed);
        }
      }
      if (regionData) {
        setRegionId(regionData);
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to load data:', error);
      setIsLoaded(true);
    }
  }, []);

  // ── 家族グループ確認＆購読開始 ──
  const checkAndSubscribeFamily = useCallback(async () => {
    try {
      const svc = getFamilyService();
      const myFamily = await svc.getMyFamily();

      if (myFamily) {
        setFamily(myFamily);
        await AsyncStorage.setItem(FAMILY_ID_KEY, myFamily.id);
        startFamilySync(myFamily.id);
      } else {
        const savedFamilyId = await AsyncStorage.getItem(FAMILY_ID_KEY);
        if (savedFamilyId) {
          await AsyncStorage.removeItem(FAMILY_ID_KEY);
          setFamily(null);
        }
      }
    } catch (e) {
      console.error('[useStore] 家族グループ確認エラー:', e);
    }
  }, []);

  // ── リアルタイム同期開始 ──
  const startFamilySync = useCallback((familyId: string) => {
    unsubItemsRef.current?.();
    unsubSettingsRef.current?.();
    setIsSyncing(true);

    const svc = getFamilyService();

    unsubItemsRef.current = svc.subscribeItems(familyId, (syncedItems: StockItem[]) => {
      setItems(syncedItems);
      AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(syncedItems)).catch(() => {});
    });

    unsubSettingsRef.current = svc.subscribeSettings(familyId, (settings: any) => {
      if (settings) {
        setMembers(settings.members);
        setRegionId(settings.regionId);
        AsyncStorage.setItem(MEMBERS_KEY, JSON.stringify(settings.members)).catch(() => {});
        AsyncStorage.setItem(REGION_KEY, settings.regionId).catch(() => {});
      }
    });
  }, []);

  // ── クリーンアップ ──
  useEffect(() => {
    return () => {
      unsubItemsRef.current?.();
      unsubSettingsRef.current?.();
    };
  }, []);

  // ── 保存関数（ローカル + Firestore） ──

  const saveItems = useCallback(async (newItems: StockItem[]) => {
    try {
      setItems(newItems);
      await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(newItems));

      if (family) {
        const svc = getFamilyService();
        const currentIds = new Set(newItems.map((i) => i.id));
        for (const item of newItems) {
          const prev = items.find((i) => i.id === item.id);
          if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
            await svc.upsertItem(family.id, item);
          }
        }
        for (const prevItem of items) {
          if (!currentIds.has(prevItem.id)) {
            await svc.deleteItem(family.id, prevItem.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to save items:', error);
    }
  }, [family, items]);

  const saveMembers = useCallback(async (newMembers: Member[]) => {
    try {
      setMembers(newMembers);
      await AsyncStorage.setItem(MEMBERS_KEY, JSON.stringify(newMembers));
      if (family) {
        await getFamilyService().saveFamilySettings(family.id, newMembers, regionId);
      }
    } catch (error) {
      console.error('Failed to save members:', error);
    }
  }, [family, regionId]);

  const saveRegion = useCallback(async (newRegionId: string) => {
    try {
      setRegionId(newRegionId);
      await AsyncStorage.setItem(REGION_KEY, newRegionId);
      if (family) {
        await getFamilyService().saveFamilySettings(family.id, members, newRegionId);
      }
    } catch (error) {
      console.error('Failed to save region:', error);
    }
  }, [family, members]);

  const completeOnboarding = useCallback(async () => {
    try {
      setIsOnboarded(true);
      await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
    }
  }, []);

  // ── 家族グループ操作 ──

  const handleCreateFamily = useCallback(async () => {
    const svc = getFamilyService();
    const newFamily = await svc.createFamily();
    if (newFamily) {
      setFamily(newFamily);
      await AsyncStorage.setItem(FAMILY_ID_KEY, newFamily.id);
      await svc.uploadAllItems(newFamily.id, items);
      await svc.saveFamilySettings(newFamily.id, members, regionId);
      startFamilySync(newFamily.id);
    }
    return newFamily;
  }, [items, members, regionId, startFamilySync]);

  const handleJoinFamily = useCallback(async (inviteCode: string) => {
    const svc = getFamilyService();
    const result = await svc.joinFamily(inviteCode);
    if (result.success && result.familyId) {
      const myFamily = await svc.getMyFamily();
      if (myFamily) {
        setFamily(myFamily);
        await AsyncStorage.setItem(FAMILY_ID_KEY, myFamily.id);
        startFamilySync(myFamily.id);
      }
    }
    return result;
  }, [startFamilySync]);

  const handleLeaveFamily = useCallback(async () => {
    if (!family) return false;
    const success = await getFamilyService().leaveFamily(family.id);
    if (success) {
      unsubItemsRef.current?.();
      unsubSettingsRef.current?.();
      unsubItemsRef.current = null;
      unsubSettingsRef.current = null;
      setFamily(null);
      setIsSyncing(false);
      await AsyncStorage.removeItem(FAMILY_ID_KEY);
    }
    return success;
  }, [family]);

  return {
    items, members, regionId, isLoaded, isOnboarded,
    loadData: loadLocalData, saveItems, saveMembers, saveRegion, completeOnboarding,
    uid, family, isSyncing,
    createFamily: handleCreateFamily,
    joinFamily: handleJoinFamily,
    leaveFamily: handleLeaveFamily,
  };
}
