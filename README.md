# ビチクフォリオ（Bichiku-folio） - 災害備蓄管理アプリ

完全な Expo React Native アプリケーション。災害に備えて食品や物資の在庫を管理し、備蓄スコアを算出するアプリです。

## プロジェクト構成

```
bichiku-folio/
├── App.tsx                          # メインアプリ（NavigationContainer、モーダル管理）
├── package.json                     # 依存パッケージ（Expo SDK 54）
├── app.json                         # Expo設定
├── tsconfig.json                    # TypeScript設定
├── babel.config.js                  # Babel設定
│
├── src/
│   ├── types.ts                     # TypeScript型定義（StockItem, Member, Sector等）
│   │
│   ├── constants/
│   │   ├── colors.ts                # カラーパレット（暗いテーマ）
│   │   ├── sectors.ts               # 商品カテゴリ（主食、主菜、飲料等）
│   │   ├── presets.ts               # 150以上の商品プリセット（自動補完用）
│   │   ├── ageKcal.ts               # 年齢別栄養必要量（厚労省基準）
│   │   ├── regions.ts               # 地域リスクプロファイル（6パターン）
│   │   └── jpAvg.ts                 # 全国平均備蓄統計
│   │
│   ├── utils/
│   │   ├── scoring.ts               # スコア計算（充足度・バランス・安定度）
│   │   ├── date.ts                  # 日付処理（期限判定、和暦変換）
│   │   ├── kana.ts                  # ひらがな⇔カタカナ変換
│   │   └── __tests__/               # ユニットテスト（Node.js test runner）
│   │       ├── scoring.test.ts      # scoring.ts テスト（14件）
│   │       └── date.test.ts         # date.ts テスト（28件+）
│   │
│   ├── hooks/
│   │   ├── useItemActions.ts         # 在庫CRUD操作カスタムフック
│   │   └── useTabSwipe.ts           # タブ間スワイプナビゲーション
│   │
│   ├── storage/
│   │   └── useStore.ts              # AsyncStorage永続化フック
│   │
│   ├── components/
│   │   ├── Bar.tsx                  # プログレスバーコンポーネント
│   │   ├── ScoreGauge.tsx            # スコアゲージコンポーネント
│   │   ├── ItemRow.tsx               # 商品行表示（消費/廃棄ボタン付き）
│   │   ├── AddModal.tsx              # 商品追加モーダル（自動補完機能）
│   │   ├── EditModal.tsx             # 商品編集モーダル
│   │   ├── ConsumeModal.tsx          # 商品消費モーダル
│   │   ├── HeaderRight.tsx           # ヘッダー右側メールアイコン
│   │   ├── ErrorBoundary.tsx         # エラーバウンダリ
│   │   ├── SwipeWrapper.tsx          # スワイプ操作ラッパー
│   │   ├── WheelPicker.tsx           # ホイールピッカー
│   │   └── MessageInbox.tsx          # メッセージ受信箱
│   │
│   └── screens/
│       ├── HomeScreen.tsx            # ホーム（スコア、内訳グラフ、カテゴリアコーディオン）
│       ├── ListScreen.tsx            # 在庫一覧（期限状態別グループ化）
│       ├── AnalysisScreen.tsx        # 分析（スコア内訳、全国比較）
│       └── SettingsScreen.tsx        # 設定（家族構成、地域選択）
```

## 機能

### 1. ホーム画面
- **備蓄スコア**: 量の充足度（40pt）、栄養バランス（40pt）、期限の安定度（20pt）
- **備蓄数量**: 日分表示、全国平均・内閣府推奨との比較
- **内訳グラフ**: react-native-svg で描画したドーナッツチャート（カロリーベース）
- **カテゴリアコーディオン**: 6つの食品カテゴリを展開表示、充足状況と期限警告

### 2. 在庫一覧
- 商品を期限状態で自動分類
  - 期限切れ（赤）
  - そろそろ消費（黄色）- 30日以内
  - ストック中（緑）- 30日以上

### 3. 分析画面
- スコア内訳（充足度・バランス・安定度）の詳細表示
- カロリー・水量の必要量と保有量
- 全国平均との比較
- 推奨備蓄期間との進捗表示

### 4. 設定
- **家族構成管理**: 10の年齢区分から選択（乳児～高齢者）
- **地域リスク選択**: 6パターン（南海トラフ、首都直下、豪雪等）
  - 各地域で推奨備蓄日数が自動変更
- 厚労省基準の表示

### 5. モーダル機能
- **追加モーダル**:
  - 150以上の商品プリセット
  - ひらがな/カタカナ対応の自動補完
  - 賞味期限入力（yyyymmdd形式で和暦表示）
  - 数量、カロリー、水量入力

- **消費モーダル**:
  - 検索機能（ひらがな/カタカナ両対応）
  - 商品リスト（期限順）
  - 数量調整（+/- ボタン）

## データ永続化

AsyncStorage を使用してローカルに保存：
- 商品リスト（items）
- 家族構成（members）
- 地域選択（regionId）

## スコア計算アルゴリズム

### 充足度（40点満点）
- カロリー充足率 × 60% + 水量充足率 × 40%
- 必要量は家族構成と選択地域の日数から計算

### バランス（40点満点）
- 目標カテゴリ配分からの平均乖離度で減点
- 6カテゴリの目標配分率：主食30%、主菜25%、飲料20%、副菜10%、調味料10%、防災グッズ5%

### 安定度（20点満点）
- 期限リスク（12点）: 30日以内の商品比率で減点
- 偏りリスク（8点）: 単一カテゴリの偏り度で減点

## 色設定（ダークテーマ）

```typescript
const COLORS = {
  bg: '#0D1117',           // 背景
  card: '#161B22',         // カード背景
  border: '#30363D',       // ボーダー
  text: '#E6EDF3',         // テキスト
  textSub: '#8B949E',      // サブテキスト
  accent: '#00D09C',       // アクセント（緑）
  green: '#00C853',        // 成功状態
  yellow: '#FFB300',       // 警告状態
  red: '#FF1744',          // エラー状態
  blue: '#58A6FF',         // 情報
  purple: '#BC8CFF',       // その他
  orange: '#FF8A65',       // 注意
};
```

## 商品プリセット

150以上の商品データを含む：
- **主食**: アルファ米（尾西）、乾パン、カロリーメイト、インスタントラーメン等
- **主菜**: ツナ缶、サバ缶、カレーレトルト、牛丼の具等
- **飲料**: 保存水、ポカリスエット、野菜ジュース、経口補水液等
- **副菜**: えいようかん、ビスコ、チョコレート、ドライフルーツ等
- **調味料**: ふりかけ、粉末スープ、味噌等
- **防災グッズ**: トイレセット、ラジオ、懐中電灯、毛布、充電池等

## インストールと実行

```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm start

# iOS でのビルド
npm run ios

# Android でのビルド
npm run android

# Web でのビルド
npm run web

# テストの実行
npm test
```

## 技術スタック

- **フレームワーク**: React Native 0.81 + Expo SDK 54
- **状態管理**: useState, useCallback, useMemo, カスタムフック
- **永続化**: @react-native-async-storage/async-storage
- **ナビゲーション**: @react-navigation/native, @react-navigation/bottom-tabs
- **グラフィックス**: react-native-svg（ドーナッツチャート）
- **UI**: React Native StyleSheet
- **言語**: TypeScript 5.3+
- **テスト**: Node.js 組み込みテストランナー（node --test）

## ファイル仕様

### types.ts
- StockItem: id, name, sec, qty, kcal, waterL, expiry, loc
- Member: id, typeId
- Sector: id, name, icon, targetRatio, color
- ScoreResult: 計算結果（total, suf, bal, risk等）

### 日付フォーマット
- 保有形式: ISO 8601 (YYYY-MM-DD)
- 入力形式: yyyymmdd （自動変換）
- 表示形式: YYYY/MM/DD （期限）、令和Y年M月D日（和暦）

## コンポーネント設計

全てのコンポーネントは **React Native** の標準コンポーネント（View, Text, TouchableOpacity等）を使用。
HTML要素は一切使用していません。

### モーダルの実装
- 透過オーバーレイ + ボトムシート形式
- AddModal: 自動補完リスト付き入力フォーム
- ConsumeModal: 検索 + 数量調整 + 確認

### グラフの実装
- react-native-svg を使用した SVG ドーナッツチャート
- Path ベースでパイスライスを描画
- 中央にカロリー表示

## 注意事項

- **和暦処理**: 令和（2019以降）、平成（1989-2019）、昭和（1925-1989）に対応
- **ひらがな/カタカナ**: Unicode コードポイントの差分を活用した変換
- **プリセット**: すべての商品はプロトタイプから完全に転記
- **期限計算**: `Date.now()` を基準として「あと○日」を動的に計算

## 今後の拡張案

- バックアップ/リストア機能
- クラウド同期（Firebase等）
- 複数世帯管理
- 期限アラート通知
- レシート読み込み（OCR）
- 栄養成分詳細表示
- 配布リスト生成
