import { PlanDefinition } from '../types';

/**
 * プラン定義
 * 広告モデル: 全機能無料 / 有料会員は広告非表示
 */
export const PLANS: Record<string, PlanDefinition> = {
  free: {
    id: 'free',
    name: '無料プラン',
    adFree: false,
  },
  premium: {
    id: 'premium',
    name: 'プレミアム（広告なし）',
    adFree: true,
  },
};

/** RevenueCat の Entitlement identifier */
export const RC_ENTITLEMENT = 'Bichiku Folio Pro';

/** 価格表示用（App Store Connect の実際の価格に合わせること） */
export const PRICING = {
  monthly: { label: '月額', price: 110, display: '¥110/月' },
  yearly: { label: '年額（一括）', price: 980, display: '¥980/年', savings: '26%お得' },
} as const;

/**
 * 広告表示ルール
 * - 商品の追加・削除・編集ごとに画像広告を1回表示
 * - actionInterval 回ごとに動画広告を表示
 */
export const AD_CONFIG = {
  /** 動画広告を表示するアクション間隔 */
  videoInterval: 10,
  /** 画像広告の表示秒数 */
  imageAdDurationMs: 3000,
  /** 動画広告の最低視聴秒数 */
  videoAdMinDurationMs: 5000,
} as const;
