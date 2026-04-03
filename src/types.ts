export interface StockItem {
  id: number;
  name: string;
  sec: string;
  qty: number;
  kcal: number;
  waterL: number;
  expiry: string;
  loc: string;
}

export interface Member {
  id: number;
  typeId: string;
}

export interface Sector {
  id: string;
  name: string;
  icon: string;
  targetRatio: number;
  color: string;
  /** 品目数ベース目標（1人あたり）。設定時はkcalではなく品目数で達成率を判定 */
  targetItemsPerPerson?: number;
}

export interface AgeCategory {
  id: string;
  label: string;
  icon: string;
  kcal: number;
  waterL: number;
}

export interface RegionProfile {
  id: string;
  name: string;
  icon: string;
  days: number;
  color: string;
  risks: string[];
  extra: string;
  areas: string;
  source: string;
}

export interface Preset {
  name: string;
  sec: string;
  kcal: number;
  waterL: number;
}

export interface ScoreResult {
  total: number;
  suf: number;
  bal: number;
  risk: number;
  totalKcal: number;
  totalWaterL: number;
  reqKcal: number;
  reqWater: number;
  kcalR: number;
  waterR: number;
  riskExp: number;
  riskSec: number;
  govDays: number;
  dailyKcal: number;
  dailyWater: number;
  familySize: number;
  userDays: number;
  vsAvgDays: number;
}
