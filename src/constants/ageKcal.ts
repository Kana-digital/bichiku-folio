import { AgeCategory } from '../types';

export const AGE_KCAL: AgeCategory[] = [
  { id: 'infant', label: '乳児(0〜1歳)', icon: '👶', kcal: 700, waterL: 1.0 },
  { id: 'toddler', label: '幼児(1〜5歳)', icon: '🧒', kcal: 1300, waterL: 1.5 },
  { id: 'child_m', label: '男児(6〜11歳)', icon: '👦', kcal: 1950, waterL: 2.0 },
  { id: 'child_f', label: '女児(6〜11歳)', icon: '👧', kcal: 1750, waterL: 2.0 },
  { id: 'teen_m', label: '男性(12〜17歳)', icon: '🧑', kcal: 2650, waterL: 2.5 },
  { id: 'teen_f', label: '女性(12〜17歳)', icon: '👩', kcal: 2050, waterL: 2.5 },
  { id: 'adult_m', label: '成人男性(18〜64歳)', icon: '👨', kcal: 2650, waterL: 3.0 },
  { id: 'adult_f', label: '成人女性(18〜64歳)', icon: '👩', kcal: 2000, waterL: 3.0 },
  { id: 'senior_m', label: '高齢男性(65歳〜)', icon: '👴', kcal: 2050, waterL: 2.5 },
  { id: 'senior_f', label: '高齢女性(65歳〜)', icon: '👵', kcal: 1650, waterL: 2.5 },
];

export const DEFAULT_MEMBERS = [
  { id: 1, typeId: 'adult_m' },
  { id: 2, typeId: 'adult_f' },
  { id: 3, typeId: 'toddler' },
];

export const GOV = {
  WATER_L_PER_DAY: 3,
  KCAL_PER_DAY: 2000,
  RECOMMENDED_DAYS: 7,
  MIN_DAYS: 3,
};
