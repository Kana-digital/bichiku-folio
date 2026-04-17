import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ListRenderItem,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { AGE_KCAL } from '../constants/ageKcal';
import { REGION_PROFILES } from '../constants/regions';
import { Member } from '../types';
import { FamilySection } from '../components/FamilySection';
import { AccountSection } from '../components/AccountSection';
import { FamilyGroup } from '../services/familyService';

interface SettingsScreenProps {
  members: Member[];
  regionId: string;
  onMembersChange: (members: Member[]) => void;
  onRegionChange: (regionId: string) => void;
  isPremium?: boolean;
  onUpgrade?: () => void;
  // 家族同期
  uid?: string | null;
  family?: FamilyGroup | null;
  isSyncing?: boolean;
  onCreateFamily?: () => Promise<FamilyGroup | null>;
  onJoinFamily?: (code: string) => Promise<{ success: boolean; error?: string }>;
  onLeaveFamily?: () => Promise<boolean>;
  onAccountDeleted?: () => Promise<void> | void;
}

export const SettingsScreen = ({
  members,
  regionId,
  onMembersChange,
  onRegionChange,
  isPremium = false,
  onUpgrade = () => {},
  uid = null,
  family = null,
  isSyncing = false,
  onCreateFamily,
  onJoinFamily,
  onLeaveFamily,
  onAccountDeleted,
}: SettingsScreenProps) => {
  const SUPPORT_EMAIL = 'bichikufolio.support@gmail.com';
  const CONTACT_CATEGORIES = [
    { id: 'bug', label: '不具合の報告', icon: '🐛' },
    { id: 'feature', label: '機能のリクエスト', icon: '💡' },
    { id: 'question', label: '使い方の質問', icon: '❓' },
    { id: 'other', label: 'その他', icon: '📝' },
  ] as const;

  const currentRegion = REGION_PROFILES.find((r) => r.id === regionId);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [contactCategory, setContactCategory] = useState<string>('bug');
  const [contactBody, setContactBody] = useState('');
  const [contactSending, setContactSending] = useState(false);

  const handleSendContact = async () => {
    if (!contactBody.trim()) {
      Alert.alert('入力エラー', 'お問い合わせ内容を入力してください');
      return;
    }

    const categoryLabel =
      CONTACT_CATEGORIES.find((c) => c.id === contactCategory)?.label ?? contactCategory;
    const subject = `[ビチクフォリオ] ${categoryLabel}`;
    const body =
      `【カテゴリ】${categoryLabel}\n\n` +
      `【内容】\n${contactBody.trim()}\n\n` +
      `--- 端末情報 ---\n` +
      `OS: ${Platform.OS} ${Platform.Version}\n`;

    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      setContactSending(true);
      const canOpen = await Linking.canOpenURL(mailto);
      if (canOpen) {
        await Linking.openURL(mailto);
        setContactBody('');
        Alert.alert('送信準備完了', 'メールアプリが開きます。内容を確認して送信してください。');
      } else {
        Alert.alert(
          'メールアプリが見つかりません',
          `${SUPPORT_EMAIL} 宛にメールをお送りください。`
        );
      }
    } catch {
      Alert.alert('エラー', 'メールアプリを起動できませんでした');
    } finally {
      setContactSending(false);
    }
  };

  const addMember = () => {
    const newMember: Member = {
      id: Math.max(...members.map((m) => m.id), 0) + 1,
      typeId: 'adult_m',
    };
    onMembersChange([...members, newMember]);
  };

  const removeMember = (id: number) => {
    onMembersChange(members.filter((m) => m.id !== id));
  };

  const changeMemberType = (id: number, typeId: string) => {
    onMembersChange(
      members.map((m) => (m.id === id ? { ...m, typeId } : m))
    );
    setEditingMemberId(null);
  };

  const renderMember: ListRenderItem<Member> = ({ item }) => {
    const ageCategory = AGE_KCAL.find((a) => a.id === item.typeId);
    const isEditing = editingMemberId === item.id;
    return (
      <View>
        <TouchableOpacity
          style={styles.memberCard}
          onPress={() => setEditingMemberId(isEditing ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.memberLeft}>
            <Text style={styles.memberIcon}>{ageCategory?.icon}</Text>
            <View style={styles.memberInfo}>
              <Text style={styles.memberLabel}>{ageCategory?.label}</Text>
              <Text style={styles.memberDetails}>
                {ageCategory?.kcal} kcal / {ageCategory?.waterL} L
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 10, color: COLORS.accent }}>
            {isEditing ? '▲ 閉じる' : '▼ 変更'}
          </Text>
        </TouchableOpacity>
        {isEditing && (
          <View style={styles.typePicker}>
            {AGE_KCAL.map((ac) => {
              const isCurrent = ac.id === item.typeId;
              return (
                <TouchableOpacity
                  key={ac.id}
                  style={[
                    styles.typeOption,
                    isCurrent && { backgroundColor: COLORS.accent + '20', borderColor: COLORS.accent },
                  ]}
                  onPress={() => changeMemberType(item.id, ac.id)}
                >
                  <Text style={{ fontSize: 16, marginRight: 6 }}>{ac.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.typeOptionLabel, isCurrent && { color: COLORS.accent }]}>
                      {ac.label}
                    </Text>
                    <Text style={styles.typeOptionSub}>
                      {ac.kcal} kcal / {ac.waterL} L
                    </Text>
                  </View>
                  {isCurrent && <Text style={{ fontSize: 10, color: COLORS.accent }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
            {/* 削除ボタン */}
            <TouchableOpacity
              style={styles.deleteOption}
              onPress={() => { removeMember(item.id); setEditingMemberId(null); }}
            >
              <Text style={styles.deleteOptionText}>このメンバーを削除</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 1. 👤 家族構成 */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>👤 家族構成</Text>
        <Text style={styles.cardSubtitle}>
          家族の年齢・性別を追加して、必要なカロリーと水量を計算します
        </Text>
        <FlatList
          data={members}
          renderItem={renderMember}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          style={styles.membersList}
        />
        <TouchableOpacity style={styles.addMemberButton} onPress={addMember}>
          <Text style={styles.addMemberButtonText}>+ メンバーを追加</Text>
        </TouchableOpacity>
      </View>

      {/* 2. 📍 お住まいの地域 */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>📍 お住まいの地域</Text>
        <Text style={styles.cardSubtitle}>
          あなたが住んでいる地域のリスク想定を選んでください。推奨備蓄期間が変わります
        </Text>

        <View style={{ gap: 6 }}>
          {REGION_PROFILES.map((rp) => {
            const isSelected = regionId === rp.id;
            return (
              <TouchableOpacity
                key={rp.id}
                onPress={() => onRegionChange(rp.id)}
                style={[
                  styles.regionOption,
                  {
                    borderColor: isSelected ? rp.color : COLORS.border,
                    borderWidth: isSelected ? 2 : 1,
                    backgroundColor: isSelected ? rp.color + '15' : COLORS.bg,
                  },
                ]}
              >
                <View style={styles.regionContent}>
                  <Text style={styles.regionIcon}>{rp.icon}</Text>
                  <View style={styles.regionInfo}>
                    <Text
                      style={[
                        styles.regionName,
                        { color: isSelected ? rp.color : COLORS.text },
                      ]}
                    >
                      {rp.name}
                    </Text>
                    <Text style={styles.regionAreas}>{rp.areas}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      styles.regionDaysNum,
                      { color: isSelected ? rp.color : COLORS.textSub },
                    ]}
                  >
                    {rp.days}日
                  </Text>
                  <Text style={styles.regionDaysSub}>推奨</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sourceText}>
          出典：内閣府防災、気象庁データに基づく推奨値
        </Text>
      </View>

      {/* 3. 📋 プラン */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📋 プラン</Text>
        <View style={styles.planInfo}>
          <View style={styles.planBadge}>
            <Text style={[styles.planBadgeText, isPremium && styles.planBadgePremium]}>
              {isPremium ? '✦ PREMIUM' : 'FREE'}
            </Text>
          </View>
          <Text style={styles.planDesc}>
            {isPremium
              ? '広告なし — すべての機能が快適に使えます'
              : '全機能無料 / 操作時に広告が表示されます'}
          </Text>
        </View>
        {!isPremium && (
          <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
            <Text style={styles.upgradeBtnText}>✦ 広告を非表示にする</Text>
          </TouchableOpacity>
        )}
        {isPremium && (
          <View style={styles.premiumActions}>
            <TouchableOpacity
              style={styles.manageSubBtn}
              onPress={() => {
                const url =
                  Platform.OS === 'ios'
                    ? 'https://apps.apple.com/account/subscriptions'
                    : 'https://play.google.com/store/account/subscriptions';
                Linking.openURL(url);
              }}
            >
              <Text style={styles.manageSubBtnText}>サブスクリプションを管理</Text>
            </TouchableOpacity>
            <Text style={styles.manageSubNote}>
              解約・プラン変更はストアの設定画面から行えます
            </Text>
          </View>
        )}
      </View>

      {/* 4. 👨‍👩‍👧‍👦 家族で共有 */}
      {onCreateFamily && onJoinFamily && onLeaveFamily && (
        <FamilySection
          uid={uid}
          family={family}
          isSyncing={isSyncing}
          onCreateFamily={onCreateFamily}
          onJoinFamily={onJoinFamily}
          onLeaveFamily={onLeaveFamily}
        />
      )}

      {/* 5. 🔑 アカウント */}
      <AccountSection uid={uid} onAccountDeleted={onAccountDeleted} />

      {/* 6. 📨 お問い合わせ */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>📨 お問い合わせ</Text>
        <Text style={styles.cardSubtitle}>
          不具合の報告やご意見・ご要望をお寄せください
        </Text>

        {/* カテゴリ選択 */}
        <View style={styles.contactCategories}>
          {CONTACT_CATEGORIES.map((cat) => {
            const isSelected = contactCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.contactCategoryChip,
                  isSelected && styles.contactCategoryChipActive,
                ]}
                onPress={() => setContactCategory(cat.id)}
              >
                <Text style={styles.contactCategoryIcon}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.contactCategoryLabel,
                    isSelected && styles.contactCategoryLabelActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 内容入力 */}
        <TextInput
          style={styles.contactInput}
          placeholder="お問い合わせ内容を入力してください..."
          placeholderTextColor={COLORS.textSub}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={contactBody}
          onChangeText={setContactBody}
        />

        {/* 送信ボタン */}
        <TouchableOpacity
          style={[styles.contactSendBtn, !contactBody.trim() && styles.contactSendBtnDisabled]}
          onPress={handleSendContact}
          disabled={contactSending || !contactBody.trim()}
        >
          <Text style={styles.contactSendBtnText}>
            {contactSending ? '準備中...' : 'メールで送信'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.contactNote}>
          メールアプリが起動します。内容を確認のうえ送信してください。
        </Text>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 9,
    color: COLORS.textSub,
    marginBottom: 10,
    lineHeight: 14,
  },

  // ── 家族 ──
  membersList: {
    marginBottom: 12,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  memberInfo: {
    flex: 1,
  },
  memberLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  memberDetails: {
    fontSize: 10,
    color: COLORS.textSub,
  },
  addMemberButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addMemberButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.bg,
  },

  // ── 地域 ──
  regionOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  regionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  regionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  regionInfo: {
    flex: 1,
  },
  regionName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  regionAreas: {
    fontSize: 9,
    color: COLORS.textSub,
  },
  regionDaysNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  regionDaysSub: {
    fontSize: 8,
    color: COLORS.textSub,
  },
  sourceText: {
    fontSize: 8,
    color: COLORS.textSub,
    marginTop: 8,
  },

  // ── 基準 ──
  criteriaRow: {
    marginVertical: 4,
  },
  criteriaLabel: {
    fontSize: 10,
    color: COLORS.textSub,
    marginBottom: 2,
  },
  criteriaValue: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 6,
  },
  infoText: {
    fontSize: 11,
    color: COLORS.textSub,
    lineHeight: 16,
  },

  // ── 属性ピッカー ──
  typePicker: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 6,
    marginTop: -2,
    overflow: 'hidden',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeOptionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  typeOptionSub: {
    fontSize: 9,
    color: COLORS.textSub,
  },
  deleteOption: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: COLORS.textSub + '10',
  },
  deleteOptionText: {
    fontSize: 11,
    color: COLORS.textSub,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  planBadge: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSub,
    letterSpacing: 1,
  },
  planBadgePremium: {
    color: COLORS.accent,
  },
  planDesc: {
    fontSize: 11,
    color: COLORS.textSub,
    flex: 1,
  },
  upgradeBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  upgradeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },

  // ── サブスク管理 ──
  premiumActions: {
    marginTop: 8,
  },
  manageSubBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  manageSubBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSub,
  },
  manageSubNote: {
    fontSize: 8,
    color: COLORS.textSub,
    textAlign: 'center',
    marginTop: 4,
  },

  // ── お問い合わせ ──
  contactCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  contactCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.bg,
  },
  contactCategoryChipActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '15',
  },
  contactCategoryIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  contactCategoryLabel: {
    fontSize: 10,
    color: COLORS.textSub,
    fontWeight: '600',
  },
  contactCategoryLabelActive: {
    color: COLORS.accent,
  },
  contactInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: COLORS.text,
    minHeight: 100,
    marginBottom: 10,
  },
  contactSendBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  contactSendBtnDisabled: {
    opacity: 0.4,
  },
  contactSendBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  contactNote: {
    fontSize: 8,
    color: COLORS.textSub,
    marginTop: 6,
    textAlign: 'center',
  },
});
