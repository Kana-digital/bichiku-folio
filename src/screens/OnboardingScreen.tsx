import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItem,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { AGE_KCAL } from '../constants/ageKcal';
import { REGION_PROFILES } from '../constants/regions';
import { Member } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');

interface OnboardingScreenProps {
  members: Member[];
  regionId: string;
  onMembersChange: (members: Member[]) => void;
  onRegionChange: (regionId: string) => void;
  onComplete: () => void;
}

export const OnboardingScreen = ({
  members,
  regionId,
  onMembersChange,
  onRegionChange,
  onComplete,
}: OnboardingScreenProps) => {
  // ── ステップ管理 ──
  const [step, setStep] = useState<0 | 1>(0);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);

  // ── 家族構成操作 ──
  const addMember = () => {
    const newMember: Member = {
      id: Math.max(...members.map((m) => m.id), 0) + 1,
      typeId: 'adult_m',
    };
    onMembersChange([...members, newMember]);
  };

  const removeMember = (id: number) => {
    if (members.length <= 1) return; // 最低1人は必要
    onMembersChange(members.filter((m) => m.id !== id));
    setEditingMemberId(null);
  };

  const changeMemberType = (id: number, typeId: string) => {
    onMembersChange(
      members.map((m) => (m.id === id ? { ...m, typeId } : m)),
    );
    setEditingMemberId(null);
  };

  // ── 家族メンバーカード ──
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
                    isCurrent && {
                      backgroundColor: COLORS.accent + '20',
                      borderColor: COLORS.accent,
                    },
                  ]}
                  onPress={() => changeMemberType(item.id, ac.id)}
                >
                  <Text style={{ fontSize: 16, marginRight: 6 }}>{ac.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.typeOptionLabel,
                        isCurrent && { color: COLORS.accent },
                      ]}
                    >
                      {ac.label}
                    </Text>
                    <Text style={styles.typeOptionSub}>
                      {ac.kcal} kcal / {ac.waterL} L
                    </Text>
                  </View>
                  {isCurrent && (
                    <Text style={{ fontSize: 10, color: COLORS.accent }}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
            {members.length > 1 && (
              <TouchableOpacity
                style={styles.deleteOption}
                onPress={() => removeMember(item.id)}
              >
                <Text style={styles.deleteOptionText}>このメンバーを削除</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // ── Step 0: 家族構成 ──
  const renderFamilyStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepEmoji}>👤</Text>
        <Text style={styles.stepTitle}>家族構成を教えてください</Text>
        <Text style={styles.stepDesc}>
          家族の人数と年齢を設定すると、必要な備蓄量を正確に計算できます
        </Text>
      </View>

      <View style={styles.contentCard}>
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

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setStep(1)}
      >
        <Text style={styles.primaryButtonText}>次へ</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Step 1: 地域選択 ──
  const renderRegionStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepEmoji}>📍</Text>
        <Text style={styles.stepTitle}>お住まいの地域</Text>
        <Text style={styles.stepDesc}>
          地域のリスク想定に合わせて推奨備蓄日数が変わります
        </Text>
      </View>

      <View style={styles.contentCard}>
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

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep(0)}
        >
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { flex: 1 }]}
          onPress={onComplete}
        >
          <Text style={styles.primaryButtonText}>はじめる</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── ステップインジケーター ──
  const totalKcal = members.reduce((sum, m) => {
    const ac = AGE_KCAL.find((a) => a.id === m.typeId);
    return sum + (ac?.kcal ?? 0);
  }, 0);
  const totalWater = members.reduce((sum, m) => {
    const ac = AGE_KCAL.find((a) => a.id === m.typeId);
    return sum + (ac?.waterL ?? 0);
  }, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛡️ ビチクフォリオ</Text>
        <Text style={styles.headerSub}>初期設定</Text>
      </View>

      {/* ステップインジケーター */}
      <View style={styles.indicatorRow}>
        <View style={styles.indicatorContainer}>
          <View
            style={[
              styles.indicatorDot,
              step === 0 && styles.indicatorDotActive,
            ]}
          />
          <Text style={[styles.indicatorLabel, step === 0 && styles.indicatorLabelActive]}>
            家族構成
          </Text>
        </View>
        <View style={styles.indicatorLine} />
        <View style={styles.indicatorContainer}>
          <View
            style={[
              styles.indicatorDot,
              step === 1 && styles.indicatorDotActive,
            ]}
          />
          <Text style={[styles.indicatorLabel, step === 1 && styles.indicatorLabelActive]}>
            地域選択
          </Text>
        </View>
      </View>

      {/* サマリーバー（ステップ1のとき表示） */}
      {step === 1 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            👤 {members.length}人世帯 — {totalKcal.toLocaleString()} kcal/日 ・ {totalWater.toFixed(1)} L/日
          </Text>
        </View>
      )}

      {/* コンテンツ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 ? renderFamilyStep() : renderRegionStep()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 10,
    color: COLORS.textSub,
    marginTop: 1,
  },

  // ── ステップインジケーター ──
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  indicatorContainer: {
    alignItems: 'center',
    gap: 4,
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
  },
  indicatorDotActive: {
    backgroundColor: COLORS.accent,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  indicatorLabel: {
    fontSize: 9,
    color: COLORS.textSub,
  },
  indicatorLabelActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  indicatorLine: {
    width: 60,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
    marginBottom: 14,
  },

  // ── サマリーバー ──
  summaryBar: {
    backgroundColor: COLORS.accent + '15',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent + '30',
  },
  summaryText: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── コンテンツ ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  stepEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 11,
    color: COLORS.textSub,
    textAlign: 'center',
    lineHeight: 16,
  },

  // ── コンテンツカード ──
  contentCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
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
    backgroundColor: COLORS.accent + '20',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    borderStyle: 'dashed',
  },
  addMemberButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
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

  // ── ピッカー ──
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

  // ── ボタン ──
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  backButton: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSub,
  },
});
