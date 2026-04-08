# CLAUDE.md - 事業B：ビチクフォリオ（防災備蓄管理アプリ）

## 事業情報
- 事業名：ビチクフォリオ（bichiku-folio）
- 目的：日本の家庭が防災備蓄を適切に管理し、災害時に必要な食料・物資を確保できるようにする
- ターゲットユーザー：日本の一般家庭（特に防災意識の高い層、子育て世帯）
- ビジネスモデル：フリーミアム（広告あり無料 / ¥110/月 or ¥980/年で広告なし）

## 技術スタック
- 言語：TypeScript（strict mode）
- フレームワーク：React Native 0.81.5 + Expo SDK 54
- React：19.1.0
- ナビゲーション：@react-navigation/native 6.x + bottom-tabs
- データ永続化：AsyncStorage（ローカルのみ）
- グラフ描画：react-native-svg
- 課金：RevenueCat（react-native-purchases）
- 広告：AdMob（react-native-google-mobile-ads）
- ビルド：Expo CLI / EAS Build

## アーキテクチャ
```
App.tsx（エントリ・ナビ・モーダル管理）
├── screens/
│   ├── HomeScreen        → スコア表示・カテゴリ一覧・ドーナツチャート（タップ対応）
│   ├── ListScreen        → 在庫リスト（期限ステータス別グループ）
│   ├── AnalysisScreen    → スコア詳細・全国比較・栄養分析・おすすめ商品
│   ├── SettingsScreen    → 家族構成・地域設定
│   └── OnboardingScreen  → 初回起動チュートリアル
├── components/
│   ├── AddModal          → 商品追加（150+プリセット・オートコンプリート）
│   ├── EditModal         → 商品編集
│   ├── ConsumeModal      → 消費記録
│   ├── AdModal           → 広告表示（AdMob / プレースホルダー自動切替）
│   └── ...
├── hooks/
│   ├── useSubscription   → サブスク+広告制御（RevenueCat統合済み）
│   ├── useItemActions    → 追加・編集・削除アクション
│   └── useTabSwipe       → タブスワイプナビ
├── services/
│   ├── admob.ts          → AdMob SDK wrapper（Expo Goフォールバック付き）
│   ├── revenueCat.ts     → RevenueCat SDK wrapper（API Key設定で有効化）
│   └── rakuten.ts        → 楽天商品検索（静的CDN画像URL付きフォールバック）
├── utils/
│   ├── scoring.ts        → スコア算出（充足度40pt + バランス40pt + 安定度20pt）
│   ├── date.ts           → 日付処理（和暦対応）
│   ├── kana.ts           → ひらがな/カタカナ変換
│   └── pushNotifications.ts → Expo Push通知
├── constants/
│   ├── presets.ts        → 180+商品プリセット（カロリー・水分量付き）
│   ├── regions.ts        → 5地域プロファイル（南海トラフ〜一般都市部）
│   ├── ageKcal.ts        → 10年齢カテゴリ別栄養所要量
│   ├── sectors.ts        → 9食品セクター定義
│   ├── chartSectors.ts   → 円グラフ用セクター（drink/bousai/seasoning除外）
│   ├── plans.ts          → プラン定義・広告設定
│   ├── jpAvg.ts          → 全国平均備蓄統計
│   └── colors.ts         → テーマカラー定義
└── storage/
    └── useStore.ts       → AsyncStorage永続化フック
```

## コアデータモデル
```typescript
StockItem { id, name, sec, qty, kcal, waterL, expiry, loc }
Member { id, typeId }  // 家族構成員（10年齢カテゴリ）
RegionProfile { id, name, days, risks, ... }  // 地域災害プロファイル
ScoreResult { total, suf, bal, risk, totalKcal, reqKcal, ... }
```

## 9セクター定義
| ID | 名前 | 目標配分 | 備考 |
|----|------|---------|------|
| staple | 主食 | 30% | 米・パン・麺 |
| side_fish | 魚介缶詰 | 8% | ツナ缶・サバ缶 |
| side_meat | 肉缶詰 | 5% | 焼き鳥缶・コンビーフ |
| side_retort | レトルト食品 | 8% | カレー・牛丼の具 |
| side_vegfruit | 野菜・果物缶 | 4% | フルーツ缶・コーン缶 |
| snack | 副菜・補助食 | 10% | ようかん・ナッツ |
| seasoning | 調味料・その他 | 10% | 品目数ベース目標 |
| drink | 飲料・水 | 20% | 水量ベース目標 |
| bousai | 防災グッズ | 5% | 品目数ベース目標 |

円グラフ表示はstaple〜snackの6セクターのみ（chartSectors.ts）。

## スコアリングアルゴリズム（100点満点）
- 充足度（40pt）：カロリー充足率 × 0.6 + 水分充足率 × 0.4
- バランス（40pt）：9カテゴリの偏差が小さいほど高得点
- 安定度（20pt）：期限切れリスク（12pt）+ カテゴリ偏り（8pt）
- ダンピング：充足度が低いとバランス・安定度も減衰

## コーディング規約
- 関数コンポーネントのみ（クラスコンポーネント禁止）
- any型の使用は最小限（TypeScript strict mode）
- コンポーネントは適切に分割（巨大ファイルを避ける）
- ダークテーマカラー：背景 #0D1117、カード #161B22、アクセント #00D09C
- 日本語UI（i18nフレームワークなし・直接記述）

## ローンチ前の残タスク
1. RevenueCatアカウント作成 → API Key取得 → revenueCat.tsに設定
2. `npx expo install react-native-purchases react-native-google-mobile-ads`
3. Apple Developer Program登録（年99ドル）
4. Google Play Consoleアカウント登録（25ドル）
5. eas.jsonのascAppIdを本番値に差し替え
6. `npx eas build --platform all --profile production`
7. `npx eas submit --platform all`

## よく使うコマンド
```bash
# 開発サーバー起動
npm start

# キャッシュクリアして起動
npx expo start --clear

# テスト実行
npm test

# EASビルド（iOS/Android）
npm run build:ios
npm run build:android
```

## AsyncStorage キー
| キー | 内容 |
|------|------|
| bichiku_items | StockItem[] |
| bichiku_members | Member[] |
| bichiku_region | string（地域ID） |
| bichiku_onboarded | "true" / null |
| bichiku_subscription | SubscriptionState |
| bichiku_ad_state | AdState |

## 注意点・落とし穴
- Expo SDK 54 + React 19 + React Native 0.81 の特定バージョン組み合わせで動作確認済み → 安易にアップグレードしない
- Expo GoではAdMob/RevenueCatのネイティブSDKが使えない → プレースホルダーモードで動作
- 楽天APIはiOS React Nativeから直接呼べない（Refererヘッダ問題） → 静的CDN画像URLを使用
- 期限なし商品は `9999-12-31` で表現
- 日付入力は yyyymmdd（8桁数字）→ YYYY-MM-DD に正規化
- 円グラフのパーセンテージは chartSectors のみの合計を分母にすること（drink/bousai/seasoning除外）
- 旧セクターID（'side'等）のデータが残っている可能性あり → pieDataはchartSectorIds.hasでフィルタ
