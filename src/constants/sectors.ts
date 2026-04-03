import { Sector } from '../types';
import { SEC_COLORS } from './colors';

export const SECTORS: Sector[] = [
  { id: 'staple', name: '主食', icon: '🍚', targetRatio: 0.30, color: SEC_COLORS[0] },
  { id: 'side', name: '主菜・缶詰', icon: '🥫', targetRatio: 0.25, color: SEC_COLORS[1] },
  { id: 'drink', name: '飲料・水', icon: '💧', targetRatio: 0.20, color: SEC_COLORS[2] },
  { id: 'snack', name: '副菜・補助食', icon: '🍫', targetRatio: 0.10, color: SEC_COLORS[3] },
  { id: 'seasoning', name: '調味料・その他', icon: '🧂', targetRatio: 0.10, color: SEC_COLORS[4], targetItemsPerPerson: 1 },
  { id: 'bousai', name: '防災グッズ', icon: '🎒', targetRatio: 0.05, color: SEC_COLORS[5], targetItemsPerPerson: 2 },
];
