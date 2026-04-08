/**
 * 楽天市場商品検索API連携サービス
 *
 * 利用前に必要なもの:
 *   1. https://webservice.rakuten.co.jp/ でアプリID取得
 *   2. https://affiliate.rakuten.co.jp/ でアフィリエイトID取得
 *   3. 下記の RAKUTEN_APP_ID / RAKUTEN_AFFILIATE_ID を設定
 */

// ── 設定 ──────────────────────────────────────────
const RAKUTEN_APP_ID = '7a722492-2487-4b4f-8461-1c606facd644';
const RAKUTEN_ACCESS_KEY = 'pk_sgWN8pmX5kvvfojBXK7bhfxeAaJqR4Tj08ZDWABcqiU';
const RAKUTEN_AFFILIATE_ID = '4c17405e.0fff5797.4c17405f.423d7005';

const API_BASE = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601';

// ── 型定義 ─────────────────────────────────────────
export interface RakutenItem {
  itemName: string;
  itemPrice: number;
  itemUrl: string;
  affiliateUrl: string;
  /** 中サイズ画像 */
  imageUrl: string;
  shopName: string;
  reviewAverage: number;
  reviewCount: number;
}

interface RakutenApiResponse {
  Items: Array<{
    Item: {
      itemName: string;
      itemPrice: number;
      itemUrl: string;
      affiliateUrl: string;
      mediumImageUrls: Array<{ imageUrl: string }>;
      shopName: string;
      reviewAverage: number;
      reviewCount: number;
    };
  }>;
  hits: number;
  pageCount: number;
}

// ── セクター別の検索キーワードマッピング ──────────────
const SECTOR_KEYWORDS: Record<string, string[]> = {
  staple:       ['アルファ米 保存食', 'パックごはん 備蓄', '保存食 パン缶詰'],
  side_fish:    ['サバ缶 保存食', 'ツナ缶 まとめ買い', '魚 缶詰 備蓄'],
  side_meat:    ['焼き鳥缶 保存食', 'コンビーフ 缶詰', '肉 缶詰 備蓄'],
  side_retort:  ['レトルトカレー 保存食', '牛丼 レトルト 備蓄', 'レトルト食品 長期保存'],
  side_vegfruit:['フルーツ缶詰 備蓄', '野菜缶詰 保存食', 'コーン缶 まとめ買い'],
  snack:        ['えいようかん 井村屋', 'ビスコ保存缶', '保存食 お菓子'],
  seasoning:    ['ふりかけ 備蓄', '粉末スープ 保存食', '調味料 保存'],
  drink:        ['保存水 2L', '10年保存水', '野菜ジュース 長期保存'],
  bousai:       ['防災セット', '簡易トイレ 防災', 'モバイルバッテリー 大容量'],
};

// リクエスト間のディレイ（レートリミット対策）
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── API呼び出し ────────────────────────────────────
/**
 * 楽天市場から商品を検索
 * @param keyword 検索キーワード
 * @param hits    取得件数（1-30, デフォルト3）
 */
export async function searchItems(
  keyword: string,
  hits = 3
): Promise<RakutenItem[]> {
  if (RAKUTEN_APP_ID === 'YOUR_RAKUTEN_APP_ID') {
    return [];
  }

  const params = new URLSearchParams({
    format: 'json',
    applicationId: RAKUTEN_APP_ID,
    accessKey: RAKUTEN_ACCESS_KEY,
    affiliateId: RAKUTEN_AFFILIATE_ID,
    keyword,
    hits: String(hits),
    sort: '-reviewCount',
    availability: '1',
  });

  try {
    const url = `${API_BASE}?${params}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: RakutenApiResponse = await res.json();
    return (data.Items ?? []).map((i) => ({
      itemName: i.Item.itemName,
      itemPrice: i.Item.itemPrice,
      itemUrl: i.Item.itemUrl,
      affiliateUrl: i.Item.affiliateUrl || i.Item.itemUrl,
      imageUrl: i.Item.mediumImageUrls?.[0]?.imageUrl ?? '',
      shopName: i.Item.shopName,
      reviewAverage: i.Item.reviewAverage,
      reviewCount: i.Item.reviewCount,
    }));
  } catch {
    return [];
  }
}

/**
 * 不足セクターに基づいておすすめ商品を取得
 * @param weakSectors  不足しているセクターIDの配列（最大3つ）
 */
export async function getRecommendations(
  weakSectors: string[]
): Promise<RakutenItem[]> {
  const targets = weakSectors.slice(0, 3);
  const results: RakutenItem[] = [];

  for (let i = 0; i < targets.length; i++) {
    const keywords = SECTOR_KEYWORDS[targets[i]];
    if (!keywords?.length) continue;
    if (i > 0) await delay(1200); // レートリミット対策
    const kw = keywords[Math.floor(Math.random() * keywords.length)];
    const items = await searchItems(kw, 2);
    results.push(...items);
  }

  return results;
}

// ── フォールバック商品（API未設定時用） ──────────────
export interface FallbackItem {
  name: string;
  brand: string;
  price: string;
  icon: string;
  imageUrl: string;
  searchQuery: string; // 楽天検索用クエリ
  sectorId: string;
}

export const FALLBACK_ITEMS: FallbackItem[] = [
  { name: '尾西のアルファ米 12種', brand: '尾西食品', price: '¥3,480', icon: '🍚', imageUrl: 'https://tshop.r10s.jp/repros-store/cabinet/img36/alpha-setfr-yoyaku.jpg?fitin=200:200', searchQuery: '尾西 アルファ米', sectorId: 'staple' },
  { name: 'サバ缶 水煮 24缶', brand: '伊藤食品', price: '¥4,980', icon: '🐟', imageUrl: 'https://tshop.r10s.jp/sakeishikawa/cabinet/item/food/imgrc0092536447.jpg?fitin=200:200', searchQuery: 'サバ缶 まとめ買い', sectorId: 'side_fish' },
  { name: '10年保存水 2L×6', brand: 'カムイワッカ', price: '¥2,480', icon: '💧', imageUrl: 'https://tshop.r10s.jp/akol/cabinet/06635893/07531328/imgrc0112807065.jpg?fitin=200:200', searchQuery: '10年保存水 2L', sectorId: 'drink' },
  { name: '防災セット 2人用', brand: 'Defend Future', price: '¥13,800', icon: '🎒', imageUrl: 'https://tshop.r10s.jp/peaceup/cabinet/bousai-set/bousai24-itg/10001178-01.jpg?fitin=200:200', searchQuery: '防災セット 2人用', sectorId: 'bousai' },
  { name: 'えいようかん 5本入×4', brand: '井村屋', price: '¥1,960', icon: '🍫', imageUrl: 'https://tshop.r10s.jp/noza-mart/cabinet/compass1772377249.jpg?fitin=200:200', searchQuery: '井村屋 えいようかん', sectorId: 'snack' },
  { name: 'ボンカレーゴールド 30個', brand: '大塚食品', price: '¥5,400', icon: '🍛', imageUrl: 'https://tshop.r10s.jp/okawa-shop/cabinet/imgrc0097670317.jpg?fitin=200:200', searchQuery: 'ボンカレー まとめ買い', sectorId: 'side_retort' },
];

/**
 * 楽天検索URLを生成（アフィリエイトID付き）
 * API未設定時でも楽天検索ページへ誘導できる
 */
export function buildRakutenSearchUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  if (RAKUTEN_AFFILIATE_ID !== 'YOUR_RAKUTEN_AFFILIATE_ID') {
    // アフィリエイトリンク形式
    return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=https://search.rakuten.co.jp/search/mall/${encoded}/&m=https://search.rakuten.co.jp/search/mall/${encoded}/`;
  }
  return `https://search.rakuten.co.jp/search/mall/${encoded}/`;
}

/**
 * APIが設定済みかどうか
 */
export function isRakutenConfigured(): boolean {
  return RAKUTEN_APP_ID !== 'YOUR_RAKUTEN_APP_ID';
}
