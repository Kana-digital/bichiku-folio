// metro.config.js
// Firebase JS SDK の @firebase/auth を React Native ビルドに正しく解決するための設定
//
// 問題:
//   firebase/auth/package.json に "react-native" フィールドがないため、
//   Metro が "browser" → ESM ビルドを使い、@firebase/auth のブラウザ版
//   （registerAuth() なし）が読み込まれる。
//   結果: "Component auth has not been registered yet" エラー。
//
// 対策:
//   unstable_enablePackageExports を有効にし、@firebase/auth の exports マップの
//   "react-native" 条件を Metro に認識させる。
//   → dist/rn/index.js（registerAuth + getReactNativePersistence あり）が使われる。

const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'import'];
// unstable_conditionsByPlatform は Expo デフォルト設定で
// ios/android に 'react-native' が含まれているのでそのまま使用

module.exports = config;
