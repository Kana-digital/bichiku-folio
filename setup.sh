#!/bin/bash
# ビチクフォリオ セットアップスクリプト
# ターミナルで実行: bash setup.sh

echo ""
echo "🛡️  ビチクフォリオ セットアップ開始"
echo "=================================="
echo ""

# Node.js チェック
if ! command -v node &> /dev/null; then
    echo "❌ Node.js が見つかりません"
    echo "👉 https://nodejs.org/ からLTS版をインストールしてください"
    echo "   インストール後、もう一度このスクリプトを実行してください"
    exit 1
fi

echo "✅ Node.js $(node -v) 検出"
echo ""

# npm install
echo "📦 パッケージをインストール中...（1〜3分かかります）"
npm install
echo ""

if [ $? -ne 0 ]; then
    echo "❌ npm install に失敗しました"
    exit 1
fi

echo "✅ インストール完了！"
echo ""
echo "🚀 Expo 開発サーバーを起動します..."
echo "   QRコードが表示されたら、iPhoneのカメラで読み取ってください"
echo ""

npx expo start
