---
name: bichiku-folio-dev
description: |
  bichiku-folio（備蓄フォリオ）アプリの開発ナレッジ。
  Expo Go + React Native の防災備蓄管理アプリで、楽天API連携、スコア計算、全国比較チャートなどの機能を持つ。
  以下のような場面で必ず使うこと：
  - bichiku-folio のコード修正・機能追加を頼まれたとき
  - 楽天API連携の問題が起きたとき（403エラー、Referer問題など）
  - AnalysisScreen のチャートやおすすめ商品の表示がおかしいとき
  - Expo Go での動作確認やデバッグが必要なとき
  bichiku-folio、備蓄、防災、楽天APIに関するリクエストがあれば積極的に使うこと。
---

# bichiku-folio 開発ナレッジ

## プロジェクト概要

防災備蓄の管理・分析アプリ。食料・水・防災グッズのストックを登録し、
備蓄スコア（充足度・バランス・安定度）を算出。全国平均や政府推奨基準との比較、
おすすめ商品提案（楽天アフィリエイト連携）などの機能を持つ。

- **フレームワーク**: Expo SDK 54 / React Native 0.81 / React 19
- **実行環境**: Expo Go（iOS / Android）
- **主要API**: 楽天市場商品検索API

## 重要なファイル構成

```
src/
├── screens/
│   ├── AnalysisScreen.tsx   ← 分析画面（スコア、チャート、おすすめ商品）
│   ├── HomeScreen.tsx       ← ホーム画面
│   └── ...
├── services/
│   └── rakuten.ts           ← 楽天API連携サービス
├── utils/
│   └── scoring.ts           ← スコア計算ロジック
├── constants/
│   ├── sectors.ts           ← セクター定義（主食、副菜魚、副菜肉...）
│   ├── jpAvg.ts             ← 全国平均データ
│   ├── ageKcal.ts           ← 政府推奨基準（GOV定数）
│   └── colors.ts            ← カラーパレット
└── types.ts                 ← 型定義（StockItem, Member, ScoreResult）
```

## 楽天API連携 — 重要な制約と対策

### iOS React Native では Referer ヘッダーを送れない

楽天の新API (`openapi.rakuten.co.jp`) は認証方式として：
- **Webアプリケーション型**: Referer ヘッダーで認証（→ iOS React Nativeでは送れない）
- **API/バックエンドサービス型**: IPアドレスで認証（→ モバイルは動的IPなので不可）

どちらもモバイルアプリからの直接呼び出しには向かない。

### 解決策: 静的画像URL埋め込み

楽天の商品画像は `tshop.r10s.jp` ドメインのCDNから配信されており、
認証なしでアクセスできる。おすすめ商品のフォールバック表示には
この CDN URL を `FallbackItem.imageUrl` に直接埋め込む方式を採用。

```typescript
// rakuten.ts の FallbackItem
export interface FallbackItem {
  name: string;
  brand: string;
  price: string;
  icon: string;        // 絵文字（画像ロード失敗時のフォールバック）
  imageUrl: string;    // tshop.r10s.jp の CDN URL
  searchQuery: string;
  sectorId: string;
}
```

**画像URLの取得方法**: 楽天市場の検索結果ページ (`search.rakuten.co.jp`) から
商品画像のURLを抽出する。画像は `tshop.r10s.jp` ドメインにあり、
`?fitin=200:200` パラメータでサイズ指定可能。

### 楽天API設定情報

```
アプリケーションID: 7a722492-2487-4b4f-8461-1c606facd644
アクセスキー: pk_sgWN8pmX5kvvfojBXK7bhfxeAaJqR4Tj08ZDWABcqiU
アフィリエイトID: 4c17405e.0fff5797.4c17405f.423d7005
APIエンドポイント: https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601
ポータル: https://webservice.rakuten.co.jp/app/list
```

### APIを呼ぶ場合のレートリミット対策

楽天APIは連続リクエストで429を返す。複数商品を取得する場合は
リクエスト間に最低1200msのディレイを入れること。

## AnalysisScreen の設計パターン

### インナーコンポーネント禁止（重要）

React Native でレンダー関数内にコンポーネントを定義すると、
親が再レンダーするたびにコンポーネントが再マウントされ、
`onLayout` などの state がリセットされる。

**NG パターン**:
```tsx
const AnalysisScreen = () => {
  const NationalComparison = () => {  // ← 毎回再定義される
    const [barWidth, setBarWidth] = useState(0);  // ← 毎回リセット
    return <View onLayout={...} />;
  };
  return <NationalComparison />;
};
```

**OK パターン**: インラインJSXとして親コンポーネントに直接展開する。
state や callback は親コンポーネントのスコープで定義。

```tsx
const AnalysisScreen = () => {
  const [barWidth, setBarWidth] = useState(0);
  const onBarLayout = useCallback((e) => {
    const w = e.nativeEvent.layout.width;
    setBarWidth(prev => Math.abs(prev - w) > 1 ? w : prev);
  }, []);

  return (
    <View onLayout={onBarLayout}>
      {/* インラインでJSXを展開 */}
    </View>
  );
};
```

### 全国比較チャートのマーカー配置

バーの幅を `onLayout` で取得し、ゾーン比率に基づいてピクセル位置を計算：
- ゾーン1 (0〜3日分): 35%
- ゾーン2 (3〜7日分): 42%
- ゾーン3 (7日分〜): 23%

`ncDayToPx` 関数で日数をピクセル位置に変換。`useCallback` で barWidth 依存にすること。

## 開発ワークフロー

### Metro キャッシュの問題

コード変更が反映されないときは、Metro バンドラーのキャッシュが原因。
必ず `npx expo start --clear` で起動すること。

### デバッグ時の注意

- デバッグ用のテキスト（pixel値表示、APIレスポンス表示など）は開発中に追加し、
  修正確認後に必ず削除する
- `console.log` もリリース前に削除する

### Expo Go 固有の制約

- カスタムネイティブモジュールは使えない（Expo Go の制限）
- AdMob などはプレースホルダーモードで動作
- `fetch()` の Referer ヘッダーは iOS で無視される
