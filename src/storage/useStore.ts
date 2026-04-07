import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StockItem, Member } from '../types';
import { DEFAULT_MEMBERS } from '../constants/ageKcal';

const ITEMS_KEY = 'bichiku_items';
const MEMBERS_KEY = 'bichiku_members';
const REGION_KEY = 'bichiku_region';

export function useStore() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [members, setMembers] = useState<Member[]>(DEFAULT_MEMBERS);
  const [regionId, setRegionId] = useState<string>('nankai');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [itemsData, membersData, regionData] = await Promise.all([
        AsyncStorage.getItem(ITEMS_KEY),
        AsyncStorage.getItem(MEMBERS_KEY),
        AsyncStorage.getItem(REGION_KEY),
      ]);

      if (itemsData) {
        const parsed = JSON.parse(itemsData);
        if (Array.isArray(parsed)) {
          setItems(
            parsed
              .filter((i: any) => i && typeof i.id === 'number' && typeof i.name === 'string')
              .map((i: any) => ({
                ...i,
                sec: typeof i.sec === 'string' ? i.sec : 'staple',
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

  const saveItems = useCallback(async (newItems: StockItem[]) => {
    try {
      setItems(newItems);
      await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(newItems));
    } catch (error) {
      console.error('Failed to save items:', error);
    }
  }, []);

  const saveMembers = useCallback(async (newMembers: Member[]) => {
    try {
      setMembers(newMembers);
      await AsyncStorage.setItem(MEMBERS_KEY, JSON.stringify(newMembers));
    } catch (error) {
      console.error('Failed to save members:', error);
    }
  }, []);

  const saveRegion = useCallback(async (newRegionId: string) => {
    try {
      setRegionId(newRegionId);
      await AsyncStorage.setItem(REGION_KEY, newRegionId);
    } catch (error) {
      console.error('Failed to save region:', error);
    }
  }, []);

  return {
    items,
    members,
    regionId,
    isLoaded,
    loadData,
    saveItems,
    saveMembers,
    saveRegion,
  };
}
