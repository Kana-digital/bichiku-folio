/**
 * ロガーユーティリティ
 *
 * __DEV__ が true（開発ビルド）の場合のみログを出力。
 * プロダクションビルドではすべて no-op になる。
 */

const noop = (..._args: any[]) => {};

export const logger = {
  log: __DEV__ ? console.log.bind(console) : noop,
  warn: __DEV__ ? console.warn.bind(console) : noop,
  error: console.error.bind(console), // エラーは常に出力
};
