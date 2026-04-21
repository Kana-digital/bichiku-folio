import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { PRICING } from '../constants/plans';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchase: (period: 'monthly' | 'yearly') => Promise<boolean>;
  onRestore: () => Promise<boolean>;
}

const BENEFITS = [
  { icon: '🚫', title: '広告なし', desc: '画像広告・動画広告が一切表示されません' },
  { icon: '⚡', title: 'スムーズ操作', desc: '追加・編集・削除がストレスフリーに' },
  { icon: '💚', title: 'アプリを応援', desc: '開発・維持の支援になります' },
];

export const PaywallModal = ({
  visible,
  onClose,
  onPurchase,
  onRestore,
}: PaywallModalProps) => {
  const [selected, setSelected] = useState<'yearly' | 'monthly'>('yearly');
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const timeoutPromise = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 60000)
      );
      const success = await Promise.race([onPurchase(selected), timeoutPromise]);
      if (success) {
        Alert.alert('購入完了', '広告が非表示になりました。ありがとうございます！');
        onClose();
      } else {
        Alert.alert(
          '購入できませんでした',
          '購入がキャンセルされたか、ストアとの通信でエラーが発生しました。' +
          '\n\n通信環境をご確認の上、もう一度お試しください。' +
          '\n\n問題が続く場合は、設定 > お問い合わせからご連絡ください。',
        );
      }
    } catch (e: any) {
      if (e.message === 'timeout') {
        Alert.alert(
          'タイムアウト',
          '購入処理に時間がかかっています。通信環境を確認してもう一度お試しください。' +
          '\n\nすでに購入済みの場合は「購入を復元」をお試しください。',
        );
      } else {
        Alert.alert(
          'エラー',
          '購入処理中にエラーが発生しました。' +
          '\n\n通信環境をご確認の上、もう一度お試しください。',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const success = await onRestore();
      if (success) {
        onClose();
      } else {
        Alert.alert('復元できませんでした', '過去の購入が見つかりませんでした。');
      }
    } catch {
      Alert.alert('エラー', '復元処理中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* ヘッダー */}
            <Text style={styles.premiumBadge}>✦ 備蓄フォリオ Pro</Text>
            <Text style={styles.title}>広告なしで快適に</Text>
            <Text style={styles.subtitle}>
              すべての機能はそのまま無料。{'\n'}
              広告だけをオフにできます。
            </Text>

            {/* メリットリスト */}
            <View style={styles.benefitList}>
              {BENEFITS.map((b, i) => (
                <View key={i} style={styles.benefitRow}>
                  <Text style={styles.benefitIcon}>{b.icon}</Text>
                  <View style={styles.benefitText}>
                    <Text style={styles.benefitTitle}>{b.title}</Text>
                    <Text style={styles.benefitDesc}>{b.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* サブスクリプション名 */}
            <Text style={styles.subscriptionName}>備蓄フォリオ Pro（広告非表示）</Text>

            {/* プラン選択 */}
            <View style={styles.planRow}>
              <TouchableOpacity
                style={[styles.planCard, selected === 'yearly' && styles.planCardSelected]}
                onPress={() => setSelected('yearly')}
              >
                {PRICING.yearly.savings && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>{PRICING.yearly.savings}</Text>
                  </View>
                )}
                <Text style={styles.planPeriod}>{PRICING.yearly.label}</Text>
                <Text style={styles.planPrice}>{PRICING.yearly.display}</Text>
                <Text style={styles.planDuration}>期間: 1年間（自動更新）</Text>
                <Text style={styles.planMonthly}>
                  月あたり ¥{Math.round(PRICING.yearly.price / 12)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.planCard, selected === 'monthly' && styles.planCardSelected]}
                onPress={() => setSelected('monthly')}
              >
                <Text style={styles.planPeriod}>{PRICING.monthly.label}</Text>
                <Text style={styles.planPrice}>{PRICING.monthly.display}</Text>
                <Text style={styles.planDuration}>期間: 1ヶ月間（自動更新）</Text>
                <Text style={styles.planMonthly}> </Text>
              </TouchableOpacity>
            </View>

            {/* 購入ボタン */}
            <TouchableOpacity
              style={[styles.purchaseBtn, loading && styles.purchaseBtnDisabled]}
              onPress={handlePurchase}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.purchaseBtnText}>
                  {selected === 'monthly'
                    ? `¥${PRICING.monthly.price}/月で広告を非表示にする`
                    : `¥${PRICING.yearly.price}/年で広告を非表示にする`}
                </Text>
              )}
            </TouchableOpacity>

            {/* 復元 */}
            <TouchableOpacity onPress={handleRestore} disabled={loading}>
              <Text style={styles.restoreText}>購入を復元</Text>
            </TouchableOpacity>

            {/* サブスクリプション説明（Apple Guideline 3.1.2(c) 必須項目） */}
            <View style={styles.subscriptionTerms}>
              <Text style={styles.termsHeader}>サブスクリプションについて</Text>
              <Text style={styles.termsText}>
                • サブスクリプション名: 備蓄フォリオ Pro{'\n'}
                • 月額プラン: ¥{PRICING.monthly.price}/月（1ヶ月ごとの自動更新）{'\n'}
                • 年額プラン: ¥{PRICING.yearly.price}/年（1年ごとの自動更新）{'\n'}
                • お支払いは購入確認時に{Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'}アカウントに請求されます{'\n'}
                • サブスクリプションは現在の期間終了の24時間前までに自動更新をオフにしない限り自動的に更新されます{'\n'}
                • 更新料金は現在の期間終了前24時間以内にアカウントに請求されます{'\n'}
                • {Platform.OS === 'ios'
                    ? '設定アプリ > Apple ID > サブスクリプション'
                    : 'Google Play ストア > お支払いと定期購入'}から管理・自動更新のオフができます
              </Text>
            </View>

            {/* 利用規約・プライバシーポリシー */}
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => Linking.openURL('https://kana-digital.github.io/bichiku-folio/terms.html')}>
                <Text style={styles.termsLink}>利用規約（EULA）</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>｜</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://kana-digital.github.io/bichiku-folio/privacy.html')}>
                <Text style={styles.termsLink}>プライバシーポリシー</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 16,
    paddingBottom: 32,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  closeBtnText: {
    fontSize: 18,
    color: COLORS.textSub,
  },

  // ── ヘッダー ──
  premiumBadge: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSub,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },

  // ── メリットリスト ──
  benefitList: {
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  benefitIcon: {
    fontSize: 22,
    width: 36,
    textAlign: 'center',
  },
  benefitText: {
    flex: 1,
    marginLeft: 8,
  },
  benefitTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  benefitDesc: {
    fontSize: 11,
    color: COLORS.textSub,
    marginTop: 1,
  },

  // ── プラン選択 ──
  planRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  planCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  planCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '0D',
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  planPeriod: {
    fontSize: 12,
    color: COLORS.textSub,
    marginBottom: 4,
    marginTop: 4,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  planMonthly: {
    fontSize: 10,
    color: COLORS.textSub,
    marginTop: 2,
  },

  // ── 購入ボタン ──
  purchaseBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseBtnDisabled: {
    opacity: 0.6,
  },
  purchaseBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },

  // ── サブスクリプション名 ──
  subscriptionName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSub,
    textAlign: 'center',
    marginBottom: 8,
  },
  planDuration: {
    fontSize: 9,
    color: COLORS.textSub,
    marginTop: 2,
  },

  // ── フッター ──
  restoreText: {
    fontSize: 12,
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: 12,
  },
  subscriptionTerms: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  termsHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  termsText: {
    fontSize: 9,
    color: COLORS.textSub,
    lineHeight: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  legalSeparator: {
    fontSize: 9,
    color: COLORS.textSub,
    marginHorizontal: 4,
  },
  termsLink: {
    fontSize: 10,
    color: COLORS.accent,
    textDecorationLine: 'underline',
  },
});
