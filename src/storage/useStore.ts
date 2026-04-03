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
        setItems(JSON.parse(itemsData));
      }
      if (membersData) {
        setMembers(JSON.parse(membersData));
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
