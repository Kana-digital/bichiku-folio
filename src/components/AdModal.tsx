import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { AD_CONFIG } from '../constants/plans';
import {
  isAdMobAvailable,
  showInterstitial,
  showRewardedInterstitial,
} from '../services/admob';

type AdType = 'image' | 'video';

interface AdModalProps {
  visible: boolean;
  adType: AdType;
  onClose: () => void;
  /** 「広告を非表示にする」を押した時 */
  onRemoveAds: () => void;
}

/**
 * 広告表示モーダル
 *
 * AdMob SDK が利用可能な場合:
 *   - image → InterstitialAd（フルスクリーン画像広告）
 *   - video → RewardedInterstitialAd（動画広告）
 *   AdMob の広告は独自のUIで表示されるため、このモーダルは
 *   SDKに処理を委譲し、完了後に自動で閉じる。
 *
 * SDK が利用不可の場合（Expo Go等）:
 *   - プレースホルダーUIを表示
 *   - カウントダウン後に閉じるボタンを表示
 */
export const AdModal = ({
  visible,
  adType,
  onClose,
  onRemoveAds,
}: AdModalProps) => {
  const [canClose, setCanClose] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptedRef = useRef(false);

  const requiredSeconds = adType === 'video'
    ? Math.ceil(AD_CONFIG.videoAdMinDurationMs / 1000)
    : Math.ceil(AD_CONFIG.imageAdDurationMs / 1000);

  useEffect(() => {
    if (!visible) {
      setCanClose(false);
      setCountdown(requiredSeconds);
      setShowFallback(false);
      attemptedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // AdMob SDK が使える場合はネイティブ広告を表示
    if (isAdMobAvailable() && !attemptedRef.current) {
      attemptedRef.current = true;
      const showAd = adType === 'video'
        ? showRewardedInterstitial
        : showInterstitial;

      showAd().then((shown) => {
        if (shown) {
          // 広告が表示されて閉じられた → モーダルも閉じる
          onClose();
        } else {
          // 読み込み失敗 → フォールバック表示
          setShowFallback(true);
          startCountdown();
        }
      });
      return;
    }

    // SDK不可 or 読み込み失敗 → プレースホルダー表示
    setShowFallback(true);
    startCountdown();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  const startCountdown = () => {
    setCountdown(requiredSeconds);
    setCanClose(false);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanClose(true);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // AdMob表示中 or 非表示の場合はモーダルを描画しない
  if (!visible || !showFallback) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 広告プレースホルダー */}
          <View style={[styles.adArea, adType === 'video' && styles.adAreaVideo]}>
            {adType === 'video' ? (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderIcon}>🎬</Text>
                <Text style={styles.placeholderTitle}>動画広告</Text>
                <Text style={styles.placeholderSub}>
                  ここに動画広告が表示されます
                </Text>
                <ActivityIndicator
                  color={COLORS.accent}
                  size="small"
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderIcon}>📢</Text>
                <Text style={styles.placeholderTitle}>広告</Text>
                <Text style={styles.placeholderSub}>
                  ここに広告が表示されます
                </Text>
              </View>
            )}
          </View>

          {/* フッター */}
          <View style={styles.footer}>
            {canClose ? (
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>✕ 閉じる</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.countdownArea}>
                <Text style={styles.countdownText}>
                  {countdown}秒後に閉じられます
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.removeAdsBtn} onPress={onRemoveAds}>
              <Text style={styles.removeAdsBtnText}>
                ¥110/月で広告を非表示にする →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  adArea: {
    height: 250,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adAreaVideo: {
    height: 300,
  },
  placeholder: {
    alignItems: 'center',
    gap: 6,
  },
  placeholderIcon: {
    fontSize: 40,
  },
  placeholderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSub,
  },
  placeholderSub: {
    fontSize: 10,
    color: COLORS.textSub,
  },
  footer: {
    padding: 14,
    gap: 10,
  },
  closeBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  countdownArea: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 12,
    color: COLORS.textSub,
  },
  removeAdsBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  removeAdsBtnText: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '600',
  },
});
