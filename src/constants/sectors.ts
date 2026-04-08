import { Sector } from '../types';
import { SEC_COLORS } from './colors';

/**
 * 全9セクター
 * 順序: 主食 → 主菜・缶詰系(4) → 副菜・補助食 → 調味料 → 飲料・水 → 防災グッズ
 * 旧 side (25%) を4つに分割: fish 8% + meat 5% + retort 8% + vegfruit 4%
 */
export const SECTORS: Sector[] = [
  { id: 'staple',       name: '主食',           icon: '🍚', targetRatio: 0.30, color: SEC_COLORS[0] },
  { id: 'side_fish',    name: '魚介缶詰',       icon: '🐟', targetRatio: 0.08, color: SEC_COLORS[1] },
  { id: 'side_meat',    name: '肉缶詰',         icon: '🍗', targetRatio: 0.05, color: SEC_COLORS[2] },
  { id: 'side_retort',  name: 'レトルト食品',    icon: '🍛', targetRatio: 0.08, color: SEC_COLORS[3] },
  { id: 'side_vegfruit',name: '野菜・果物缶',    icon: '🥬', targetRatio: 0.04, color: SEC_COLORS[4] },
  { id: 'snack',        name: '副菜・補助食',    icon: '🍫', targetRatio: 0.10, color: SEC_COLORS[5] },
  { id: 'seasoning',    name: '調味料・その他',   icon: '🧂', targetRatio: 0.10, color: SEC_COLORS[6], targetItemsPerPerson: 1 },
  { id: 'drink',        name: '飲料・水',        icon: '💧', targetRatio: 0.20, color: SEC_COLORS[7] },
  { id: 'bousai',       name: '防災グッズ',      icon: '🎒', targetRatio: 0.05, color: SEC_COLORS[8], targetItemsPerPerson: 2 },
];
