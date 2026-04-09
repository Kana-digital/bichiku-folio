#!/bin/bash
# ビチクフォリオ ローンチ準備スクリプト
# 使い方: cd bichiku-folio && bash scripts/setup-launch.sh

set -e
echo "🛡️ ビチクフォリオ ローンチ準備"
echo "================================"

# 1. 必要パッケージのインストール
echo ""
echo "📦 Step 1: 必要パッケージをインストール中..."
npx expo install expo-notifications expo-device react-native-purchases react-native-google-mobile-ads
echo "✅ パッケージインストール完了"

# 2. GitHub リポジトリ初期化 & プッシュ
echo ""
echo "📤 Step 2: GitHub リポジトリをセットアップ..."

if ! git remote | grep -q origin; then
  echo "  GitHub にリポジトリを作成します..."
  # gh コマンドがあるか確認
  if command -v gh &> /dev/null; then
    gh repo create bichiku-folio --private --source=. --push
    echo "  ✅ リポジトリ作成 & プッシュ完了"
  else
    echo "  ⚠️ gh コマンドが見つかりません。手動でリポジトリを作成してください："
    echo "     git remote add origin https://github.com/YOUR_USERNAME/bichiku-folio.git"
    echo "     git push -u origin main"
  fi
else
  echo "  リモートリポジトリが既に設定されています"
  git push origin main 2>/dev/null || echo "  ⚠️ プッシュに失敗しました。手動で確認してください"
fi

# 3. Git に変更をコミット
echo ""
echo "📝 Step 3: 変更をコミット..."
git add -A
git commit -m "ローンチ準備: アイコン・プラポリ・ビルドスクリプト・logger整理

- アプリアイコン・スプラッシュスクリーン追加
- プライバシーポリシー・利用規約 (docs/)
- PaywallModal にプラポリ・利用規約リンク追加
- 本番用ビルド/サブミットスクリプト追加
- console.log → logger ユーティリティ（__DEV__制御）
- 旧セクターID 'side' の自動マイグレーション
- OnboardingScreen 5ステップ化
- SettingsScreen セクション順序変更
- metro.config.js: firebase/auth RN ビルド解決
- Firebase Anonymous Auth + 家族同期機能" 2>/dev/null || echo "  (変更なし or 既にコミット済み)"

# 4. GitHub Pages 有効化案内
echo ""
echo "🌐 Step 4: GitHub Pages を有効にしてください"
echo "  1. https://github.com/YOUR_USERNAME/bichiku-folio/settings/pages にアクセス"
echo "  2. Source: Deploy from a branch"
echo "  3. Branch: main, Folder: /docs"
echo "  4. Save"
echo ""
echo "  プラポリURL: https://YOUR_USERNAME.github.io/bichiku-folio/privacy.html"
echo "  利用規約URL: https://YOUR_USERNAME.github.io/bichiku-folio/terms.html"

echo ""
echo "================================"
echo "🎉 自動セットアップ完了!"
echo ""
echo "📋 残りの手動タスク:"
echo "  1. Apple Developer Program に登録 (https://developer.apple.com)"
echo "  2. App Store Connect でアプリ作成 → ascAppId をメモ"
echo "  3. RevenueCat で iOS アプリ登録 → 本番 API Key をメモ"
echo "  4. 上の2つの値を教えてもらえれば、コードに設定します"
echo "  5. その後 npm run build:all:prod → npm run submit:all"
