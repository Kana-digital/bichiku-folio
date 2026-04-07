import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

interface PremiumGateProps {
  /** ロックされたセクションのタイトル */
  title: string;
  /** 説明テキスト */
  description?: string;
  /** 「プレミアムに」ボタン押下 */
  onUpgrade: () => void;
  /** 子要素をぼかし風に表示 */
  children?: React.ReactNode;
}

/**
 * 無料プランユーザーに対して機能がロックされていることを表示するゲート。
 * children がある場合、薄くぼかした状態でプレビューを重ねて表示する。
 */
export const PremiumGate = ({ title, description, onUpgrade, children }: PremiumGateProps) => {
  return (
    <View style={styles.wrapper}>
      {/* ぼかしプレビュー */}
      {children && (
        <View style={styles.preview} pointerEvents="none">
          <View style={styles.blurOverlay}>{children}</View>
        </View>
      )}

      {/* ロックオーバーレイ */}
      <View style={[styles.lockOverlay, !children && styles.lockOverlayStandalone]}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.lockTitle}>{title}</Text>
        {description && <Text style={styles.lockDesc}>{description}</Text>}
        <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
          <Text style={styles.upgradeBtnText}>✦ プレミアムで開放</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  preview: {
    opacity: 0.3,
  },
  blurOverlay: {
    // children をそのまま表示（opacity で薄く見せる）
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.card + 'CC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent + '33',
  },
  lockOverlayStandalone: {
    position: 'relative',
    paddingVertical: 28,
  },
  lockIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  lockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  lockDesc: {
    fontSize: 11,
    color: COLORS.textSub,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  upgradeBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  upgradeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
});
