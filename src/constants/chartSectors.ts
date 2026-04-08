/**
 * 円グラフ表示用のセクター定義
 * - drink（飲料・水）と bousai（防災グッズ）は除外
 * - スコアリングには影響しない（scoring.ts は SECTORS 全体を使用）
 */
import { SECTORS } from './sectors';

/** 円グラフに表示しないセクターID */
const CHART_EXCLUDE = new Set(['drink', 'bousai', 'seasoning']);

/** 円グラフ用セクター一覧 */
export const CHART_SECTORS = SECTORS.filter((s) => !CHART_EXCLUDE.has(s.id));
