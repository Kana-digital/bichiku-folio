# CLAUDE.md - 事業B：ビチクフォリオ（防災備蓄管理アプリ）

## 事業情報
- 事業名：ビチクフォリオ（bichiku-folio）
- 目的：日本の家庭が防災備蓄を適切に管理し、災害時に必要な食料・物資を確保できるようにする
- ターゲットユーザー：日本の一般家庭（特に防災意識の高い層、子育て世帯）
- ビジネスモデル：フリーミアム（広告あり無料 / ¥100/月 or ¥1,000/年で広告なし）

## 技術スタック
- 言語：TypeScript（strict mode）
- フレームワーク：React Native 0.81.5 + Expo SDK 54
- React：19.1.0
- ナビゲーション：@react-navigation/native 6.x + bottom-tabs
- データ永続化：AsyncStorage（ローカル）+ Cloud Firestore（家族同期）
- 認証：Firebase Anonymous Auth → メールアドレス紐付けでアカウント復元
- 同期：Firebase JS SDK v10（モジュラー）→ Expo Go 互換
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
│   ├── SettingsScreen    → 家族構成・地域設定・家族同期・アカウント管理
│   └── OnboardingScreen  → 初回起動チュートリアル
├── components/
│   ├── AddModal          → 商品追加（150+プリセット・オートコンプリート）
│   ├── EditModal         → 商品編集
│   ├── ConsumeModal      → 消費記録
│   ├── AdModal           → 広告表示（AdMob / プレースホルダー自動切替）
│   ├── FamilySection     → 家族グループ管理（作成/参加/脱退/招待コード共有）
│   ├── AccountSection    → アカウント管理（メールアドレス紐付け）
│   └── ...
├── hooks/
│   ├── useSubscription   → サブスク+広告制御（RevenueCat統合済み）
│   ├── useItemActions    → 追加・編集・削除アクション
│   └── useTabSwipe       → タブスワイプナビ
├── services/
│   ├── firebase.ts       → Firebase初期化（AsyncStorage永続化・シングルトン）
│   ├── authService.ts    → 認証サービス（匿名サインイン・メール紐付け）
│   ├── familyService.ts  → 家族グループCRUD・リアルタイム同期
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
FamilyGroup { id, inviteCode, members[], createdBy }  // 家族グループ（Firestore）
```

## Firebase / 家族同期アーキテクチャ
- **認証**: Firebase Anonymous Auth（アプリ起動時に自動匿名サインイン）→ オプションでメールアドレス紐付け
- **データ同期**: Cloud Firestore（asia-northeast1 / Tokyo）
- **衝突解決**: Last Write Wins
- **Firestoreデータ構造**:
  - `families/{familyId}` — inviteCode, members[], createdBy, createdAt
  - `families/{familyId}/items/{itemId}` — StockItemフィールド + updatedBy, updatedAt
  - `families/{familyId}/settings/main` — members[], regionId, updatedBy, updatedAt
- **セキュリティルール**: 認証済みユーザーのみ読み取り可、membersに含まれるユーザーのみ書き込み可
- **招待コード**: 6桁（A-Z + 2-9、紛らわしい文字除外）、グループ上限10人

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

### 完了済み
- ~~RevenueCatアカウント作成 → API Key取得 → revenueCat.tsに設定~~ ✅
- ~~Firebase JS SDK 導入 + 家族同期機能実装~~ ✅
- ~~metro.config.js で firebase/auth の RN ビルド解決~~ ✅
- ~~旧セクターID "side" の自動マイグレーション~~ ✅
- ~~アプリアイコン・スプラッシュスクリーン作成~~ ✅
- ~~プライバシーポリシー・利用規約作成（docs/）~~ ✅
- ~~PaywallModal にプラポリ・利用規約リンク追加~~ ✅
- ~~本番用ビルド/サブミットスクリプト追加~~ ✅
- ~~console.log → logger ユーティリティ（__DEV__制御）~~ ✅
- ~~OnboardingScreen 5ステップ化（家族構成→地域→プラン→共有→アカウント）~~ ✅

### ローカルで実行が必要
1. `npx expo install expo-notifications expo-device react-native-purchases react-native-google-mobile-ads`
2. プラポリ・利用規約を GitHub Pages にデプロイ（docs/ フォルダ使用）
   - リポジトリ設定 → Pages → Source: main / docs
   - URL: https://kana-digital.github.io/bichiku-folio/privacy.html, https://kana-digital.github.io/bichiku-folio/terms.html

### アカウント登録系
3. Apple Developer Program 登録（年99ドル）
4. App Store Connect でアプリ作成 → eas.json の ascAppId を差し替え
5. RevenueCat で iOS アプリ登録 → revenueCat.ts の API_KEY_IOS を本番値に差し替え
6. Google Play Console でサービスアカウント JSON を取得（Android 自動サブミット用）

### ビルド・サブミット
7. `npm run build:all:prod`（EAS Build）
8. `npm run submit:all`（EAS Submit）

## よく使うコマンド
```bash
# 依存パッケージインストール（初回 or firebase追加後）
npm install

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
| bichiku_family_id | string（家族グループID） |

## 注意点・落とし穴
- Expo SDK 54 + React 19 + React Native 0.81 の特定バージョン組み合わせで動作確認済み → 安易にアップグレードしない
- Expo GoではAdMob/RevenueCatのネイティブSDKが使えない → プレースホルダーモードで動作
- 楽天APIはiOS React Nativeから直接呼べない（Refererヘッダ問題） → 静的CDN画像URLを使用
- 期限なし商品は `9999-12-31` で表現
- 日付入力は yyyymmdd（8桁数字）→ YYYY-MM-DD に正規化
- 円グラフのパーセンテージは chartSectors のみの合計を分母にすること（drink/bousai/seasoning除外）
- 旧セクターID（'side'等）のデータが残っている可能性あり → pieDataはchartSectorIds.hasでフィルタ
- Firebase JS SDK v10（モジュラー）を使用 → @react-native-firebase はExpo Goで使えないため不使用
- 家族同期中はsubscribeItems/subscribeSettingsのonSnapshotでリアルタイム更新される
- 家族グループ未参加時はAsyncStorageのみ（オフライン動作可）
- Firestoreのセキュリティルールはasia-northeast1（東京）にデプロイ済み

## App Store 審査リジェクト対応ログ（2026-04）

### リジェクト理由と対処

**Guideline 2.1.0 — App Completeness（iPadクラッシュ）**
- iPadでアプリがクラッシュする問題。iPad Simulatorでの動作確認が必須
- 対処: iPad向けのレイアウト修正 or `app.json` で `"supportsTablet": false` を明示

**Guideline 2.1(b) — In-App Purchase not submitted with binary**
- RevenueCat連携のIAPをApp Store Connectで作成していなかった
- 対処: App Store Connect > サブスクリプション で商品を作成し、ビルドと一緒に提出

**Guideline 2.3.10 — Accurate Metadata（スクリーンショットのステータスバー）**
- Expo GoのUIや非iOS標準のステータスバーがスクショに映っていた
- 対処: iOS Simulatorで `xcrun simctl status_bar` を使い、9:41表示に統一してからスクショ撮影

### スクリーンショット撮影ワークフロー

1. **デモデータを用意**（`src/utils/demoData.ts` を一時的に作成→useStore.tsのloadLocalData内でAsyncStorageの読み込み前に呼ぶ）
2. **Simulatorの起動と設定**
   ```bash
   # デバイス作成（なければ）
   xcrun simctl create "iPhone 16 Pro Max" "com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro-Max"
   xcrun simctl create "iPhone 11 Pro Max" "com.apple.CoreSimulator.SimDeviceType.iPhone-11-Pro-Max"
   # ステータスバーを9:41に固定
   xcrun simctl status_bar <UDID> override --time "9:41"
   # スクリーンショット撮影
   xcrun simctl io <UDID> screenshot ~/path/to/screenshot.png
   ```
3. **撮影後はデモデータファイルを削除し、useStore.tsへの変更もrevert**
4. **必要サイズ**: 6.9インチ（iPhone 16 Pro Max）と 6.5インチ（iPhone 11 Pro Max）

### スクショ撮影でハマったポイント

- `npx expo start --ios` は `osascript` エラーになることがある → `npx expo start` で起動後、`i` キーでSimulator接続
- Expo Goモードと Development Build モードが混在する → Metro CLIで `s` キーを押してExpo Goに切り替え
- 2台目のSimulatorにExpo Goが入っていない場合 → 1台目をシャットダウンしてから `i` キーで2台目に接続
- デモデータ投入後にアプリが白画面 → `loadDemoData()` を `useStore.ts` の `loadLocalData()` 内、AsyncStorage読み込み**前**に配置する必要がある（App.tsxからだとタイミング問題）

### App Store Connect ブラウザ操作の注意

- SPAのためスクロールすると画面が白くなる → ページリロードか `find` ツール + `ref` クリックで回避
- Shadow DOMが多用されており、querySelector等が効かない
- ファイルアップロード（スクリーンショット）は自動操作がブロックされることがある → 手動ドラッグ&ドロップが確実
- 6.9インチセクションはデフォルトで非表示 → 「メディアマネージャーですべてのサイズを表示」をクリックして展開する必要あり
- セッション切れが頻発し、Apple IDのiframeログインは自動化困難 → パスワード入力はユーザーに依頼
