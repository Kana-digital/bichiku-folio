import { StockItem, Member, ScoreResult } from '../types';
import { SECTORS } from '../constants/sectors';
import { AGE_KCAL, GOV } from '../constants/ageKcal';
import { JP_AVG } from '../constants/jpAvg';

export function getMemberKcal(members: Member[]): number {
  return members.reduce((s, m) => {
    const t = AGE_KCAL.find((a) => a.id === m.typeId);
    return s + (t?.kcal ?? GOV.KCAL_PER_DAY);
  }, 0);
}

export function getMemberWater(members: Member[]): number {
  return members.reduce((s, m) => {
    const t = AGE_KCAL.find((a) => a.id === m.typeId);
    return s + (t?.waterL ?? GOV.WATER_L_PER_DAY);
  }, 0);
}

export function calcScore(
  items: StockItem[],
  members: Member[],
  targetDays: number
): ScoreResult {
  const familySize = members.length;
  const totalKcal = items.reduce((s, i) => s + (i.qty ?? 0) * (i.kcal ?? 0), 0);
  const totalWaterL = items.reduce((s, i) => s + (i.qty ?? 0) * (i.waterL ?? 0), 0);
  const dailyKcal = getMemberKcal(members);
  const dailyWater = getMemberWater(members);
  const reqKcal = dailyKcal * targetDays;
  const reqWater = dailyWater * targetDays;

  const kcalR = reqKcal > 0 ? Math.min(1, totalKcal / reqKcal) : 0;
  const waterR = reqWater > 0 ? Math.min(1, totalWaterL / reqWater) : 0;
  const suf = 40 * (kcalR * 0.6 + waterR * 0.4);

  const devs = SECTORS.map((s) => {
    const sKcal = items
      .filter((i) => i.sec === s.id)
      .reduce((a, i) => a + (i.qty ?? 0) * (i.kcal ?? 0), 0);
    const ratio = totalKcal > 0 ? sKcal / totalKcal : 0;
    return Math.abs(ratio - s.targetRatio);
  });
  const avgDev = devs.reduce((a, b) => a + b, 0) / SECTORS.length;
  const bal = Math.max(0, 40 * (1 - avgDev * 4));

  const datedItems = items.filter((i) => {
    const exp = i.expiry ?? '9999-12-31';
    return exp !== '9999-12-31' && !isNaN(new Date(exp).getTime());
  });
  const now = new Date();
  const expiring = datedItems.filter((i) => {
    const d = Math.ceil((new Date(i.expiry ?? '9999-12-31').getTime() - now.getTime()) / 86400000);
    return d > 0 && d <= 30;
  }).length;
  const expR = datedItems.length > 0 ? expiring / datedItems.length : 0;
  const riskExp = 12 * Math.max(0, 1 - expR * 3);

  const maxR = SECTORS.reduce((mx, s) => {
    const sk = items
      .filter((i) => i.sec === s.id)
      .reduce((a, i) => a + (i.qty ?? 0) * (i.kcal ?? 0), 0);
    return Math.max(mx, totalKcal > 0 ? sk / totalKcal : 0);
  }, 0);
  const riskSec = maxR > 0.5 ? 8 * Math.max(0, 1 - (maxR - 0.5) * 4) : 8;
  const riskRaw = Math.round(riskExp + riskSec);

  // 充足度が低いとき、バランス・安定度を抑制（ほぼ空の備蓄でスコアが高く出るのを防ぐ）
  const sufRatio = suf / 40; // 0〜1
  const dampFactor = Math.min(1, Math.sqrt(sufRatio) * 1.5);
  const balAdj = Math.round(bal * dampFactor);
  const risk = Math.round(riskRaw * dampFactor);

  return {
    total: Math.round(suf + balAdj + risk),
    suf: Math.round(suf),
    bal: balAdj,
    risk,
    totalKcal,
    totalWaterL,
    reqKcal,
    reqWater,
    kcalR,
    waterR,
    riskExp: Math.round(riskExp),
    riskSec: Math.round(riskSec),
    govDays: targetDays,
    dailyKcal,
    dailyWater,
    familySize,
    userDays: dailyKcal > 0 ? totalKcal / dailyKcal : 0,
    vsAvgDays: dailyKcal > 0 ? totalKcal / dailyKcal - JP_AVG.avgDays : -JP_AVG.avgDays,
  };
}
