import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ListRenderItem,
  Dimensions,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { AGE_KCAL } from '../constants/ageKcal';
import { REGION_PROFILES } from '../constants/regions';
import { Member } from '../types';
import { FamilyGroup } from '../services/familyService';

const { width: SCREEN_W } = Dimensions.get('window');

const STEPS = [
  { key: 'family', label: '家族構成', icon: '👤' },
  { key: 'region', label: '地域', icon: '📍' },
  { key: 'plan', label: 'プラン', icon: '📋' },
  { key: 'share', label: '共有', icon: '👨‍👩‍👧‍👦' },
  { key: 'account', label: 'アカウント', icon: '🔑' },
] as const;

interface OnboardingScreenProps {
  members: Member[];
  regionId: string;
  onMembersChange: (members: Member[]) => void;
  onRegionChange: (regionId: string) => void;
  onComplete: () => void;
  // プラン
  isPremium?: boolean;
  onUpgrade?: () => void;
  // 家族同期
  uid?: string | null;
  family?: FamilyGroup | null;
  onCreateFamily?: () => Promise<FamilyGroup | null>;
  onJoinFamily?: (code: string) => Promise<{ success: boolean; error?: string }>;
  // アカウント
  onLinkEmail?: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

export const OnboardingScreen = ({
  members,
  regionId,
  onMembersChange,
  onRegionChange,
  onComplete,
  isPremium = false,
  onUpgrade = () => {},
  uid = null,
  family = null,
  onCreateFamily,
  onJoinFamily,
  onLinkEmail,
}: OnboardingScreenProps) => {
  const [step, setStep] = useState(0);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);

  // 家族共有用
  const [inviteInput, setInviteInput] = useState('');
  const [familyLoading, setFamilyLoading] = useState(false);
  const [createdFamily, setCreatedFamily] = useState<FamilyGroup | null>(family);

  // アカウント用
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [isLinked, setIsLinked] = useState(false);

  const totalSteps = STEPS.length;
  const isLastStep = step === totalSteps - 1;

  const goNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setStep((s) => Math.min(s + 1, totalSteps - 1));
    }
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  // ── 家族構成 ──
  const addMember = () => {
    const newMember: Member = {
      id: Math.max(...members.map((m) => m.id), 0) + 1,
      typeId: 'adult_m',
    };
    onMembersChange([...members, newMember]);
  };

  const removeMember = (id: number) => {
    if (members.length <= 1) return;
    onMembersChange(members.filter((m) => m.id !== id));
    setEditingMemberId(null);
  };

  const changeMemberType = (id: number, typeId: string) => {
    onMembersChange(members.map((m) => (m.id === id ? { ...m, typeId } : m)));
    setEditingMemberId(null);
  };

  // ── 家族共有ハンドラ ──
  const handleCreateFamily = useCallback(async () => {
    if (!onCreateFamily) return;
    setFamilyLoading(true);
    try {
      const result = await onCreateFamily();
      if (result) {
        setCreatedFamily(result);
        Alert.alert(
          'グループを作成しました',
          `招待コード: ${result.inviteCode}\n\nこのコードを家族に共有して、同じグループに参加してもらいましょう。`,
        );
      } else {
        Alert.alert('エラー', 'グループの作成に失敗しました');
      }
    } finally {
      setFamilyLoading(false);
    }
  }, [onCreateFamily]);

  const handleJoinFamily = useCallback(async () => {
    if (!onJoinFamily) return;
    const code = inviteInput.trim();
    if (code.length < 6) {
      Alert.alert('入力エラー', '6桁の招待コードを入力してください');
      return;
    }
    setFamilyLoading(true);
    try {
      const result = await onJoinFamily(code);
      if (result.success) {
        Alert.alert('参加しました', '家族グループに参加しました。');
        setInviteInput('');
      } else {
        Alert.alert('エラー', result.error ?? '参加に失敗しました');
      }
    } finally {
      setFamilyLoading(false);
    }
  }, [inviteInput, onJoinFamily]);

  const handleShareCode = useCallback(async () => {
    const f = createdFamily ?? family;
    if (!f) return;
    try {
      await Share.share({
        message: `ビチクフォリオの家族グループに参加しよう!\n招待コード: ${f.inviteCode}`,
      });
    } catch {}
  }, [createdFamily, family]);

  // ── アカウント紐付け ──
  const handleLinkEmail = useCallback(async () => {
    if (!onLinkEmail) return;
    if (!email.trim() || password.length < 6) {
      Alert.alert('入力エラー', 'メールアドレスとパスワード（6文字以上）を入力してください');
      return;
    }
    setAccountLoading(true);
    try {
      const result = await onLinkEmail(email.trim(), password);
      if (result.success) {
        setIsLinked(true);
        Alert.alert('紐付け完了', '機種変更時にこのメールアドレスでアカウントを復元できます。');
      } else {
        Alert.alert('エラー', result.error ?? '紐付けに失敗しました');
      }
    } finally {
      setAccountLoading(false);
    }
  }, [email, password, onLinkEmail]);

  // ── メンバーカード ──
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
            {members.length > 1 && (
              <TouchableOpacity style={styles.deleteOption} onPress={() => removeMember(item.id)}>
                <Text style={styles.deleteOptionText}>このメンバーを削除</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // ══════════════════════════════
  //  Step 0: 家族構成
  // ══════════════════════════════
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
    </View>
  );

  // ══════════════════════════════
  //  Step 1: 地域選択
  // ══════════════════════════════
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
                    <Text style={[styles.regionName, { color: isSelected ? rp.color : COLORS.text }]}>
                      {rp.name}
                    </Text>
                    <Text style={styles.regionAreas}>{rp.areas}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.regionDaysNum, { color: isSelected ? rp.color : COLORS.textSub }]}>
                    {rp.days}日
                  </Text>
                  <Text style={styles.regionDaysSub}>推奨</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.sourceText}>出典：内閣府防災、気象庁データに基づく推奨値</Text>
      </View>
    </View>
  );

  // ══════════════════════════════
  //  Step 2: プラン
  // ══════════════════════════════
  const renderPlanStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepEmoji}>📋</Text>
        <Text style={styles.stepTitle}>ご利用プラン</Text>
        <Text style={styles.stepDesc}>
          すべての機能は無料でご利用いただけます。広告を非表示にしたい場合はプレミアムプランをご検討ください。
        </Text>
      </View>
      <View style={styles.contentCard}>
        {/* FREE プラン */}
        <View style={[styles.planCard, !isPremium && styles.planCardSelected]}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>FREE</Text>
            <Text style={styles.planPrice}>¥0</Text>
          </View>
          <Text style={styles.planFeature}>全機能が利用可能</Text>
          <Text style={styles.planFeature}>操作時に広告が表示されます</Text>
        </View>

        {/* PREMIUM プラン */}
        <View style={[styles.planCard, isPremium && styles.planCardSelected, { marginTop: 8 }]}>
          <View style={styles.planHeader}>
            <Text style={[styles.planName, { color: COLORS.accent }]}>✦ PREMIUM</Text>
            <Text style={styles.planPrice}>¥110/月 or ¥980/年</Text>
          </View>
          <Text style={styles.planFeature}>広告なしで快適に利用</Text>
          <Text style={styles.planFeature}>すべての機能が使えます</Text>
        </View>

        {!isPremium && (
          <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
            <Text style={styles.upgradeBtnText}>✦ 広告を非表示にする</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ══════════════════════════════
  //  Step 3: 家族で共有
  // ══════════════════════════════
  const currentFamily = createdFamily ?? family;

  const renderShareStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepEmoji}>👨‍👩‍👧‍👦</Text>
        <Text style={styles.stepTitle}>家族で共有</Text>
        <Text style={styles.stepDesc}>
          家族グループを作成すると、備蓄データをリアルタイムで共有できます。あとから設定することもできます。
        </Text>
      </View>
      <View style={styles.contentCard}>
        {currentFamily ? (
          // グループ作成済み
          <View>
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>招待コード</Text>
              <Text style={styles.codeValue}>{currentFamily.inviteCode}</Text>
            </View>
            <TouchableOpacity style={styles.shareCodeBtn} onPress={handleShareCode}>
              <Text style={styles.shareCodeBtnText}>📤 コードを共有</Text>
            </TouchableOpacity>
            <Text style={styles.shareNote}>
              家族にこのコードを送って、同じグループに参加してもらいましょう
            </Text>
          </View>
        ) : (
          // 未作成
          <View>
            <TouchableOpacity
              style={styles.createFamilyBtn}
              onPress={handleCreateFamily}
              disabled={familyLoading || !onCreateFamily}
            >
              {familyLoading ? (
                <ActivityIndicator size="small" color={COLORS.bg} />
              ) : (
                <Text style={styles.createFamilyBtnText}>+ グループを作成</Text>
              )}
            </TouchableOpacity>

            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>または</Text>
              <View style={styles.orLine} />
            </View>

            <Text style={styles.joinLabel}>招待コードで参加</Text>
            <TextInput
              style={styles.codeInput}
              value={inviteInput}
              onChangeText={(t) => setInviteInput(t.toUpperCase())}
              placeholder="招待コード（6桁）"
              placeholderTextColor={COLORS.textSub}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.joinBtn, inviteInput.length < 6 && styles.btnDisabled]}
              onPress={handleJoinFamily}
              disabled={familyLoading || inviteInput.length < 6 || !onJoinFamily}
            >
              {familyLoading ? (
                <ActivityIndicator size="small" color={COLORS.bg} />
              ) : (
                <Text style={styles.joinBtnText}>参加する</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  // ══════════════════════════════
  //  Step 4: アカウント
  // ══════════════════════════════
  const renderAccountStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepEmoji}>🔑</Text>
        <Text style={styles.stepTitle}>アカウント設定</Text>
        <Text style={styles.stepDesc}>
          メールアドレスを紐付けると、機種変更時にデータを引き継げます。あとから設定することもできます。
        </Text>
      </View>
      <View style={styles.contentCard}>
        {isLinked ? (
          <View style={styles.linkedBox}>
            <Text style={styles.linkedIcon}>✓</Text>
            <Text style={styles.linkedText}>メールアドレスを紐付けました</Text>
            <Text style={styles.linkedEmail}>{email}</Text>
          </View>
        ) : (
          <View>
            <TextInput
              style={styles.accountInput}
              value={email}
              onChangeText={setEmail}
              placeholder="メールアドレス"
              placeholderTextColor={COLORS.textSub}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={[styles.accountInput, { marginTop: 8 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="パスワード（6文字以上）"
              placeholderTextColor={COLORS.textSub}
              secureTextEntry
            />
            <TouchableOpacity
              style={[
                styles.linkBtn,
                (!email.trim() || password.length < 6) && styles.btnDisabled,
              ]}
              onPress={handleLinkEmail}
              disabled={accountLoading || !email.trim() || password.length < 6 || !onLinkEmail}
            >
              {accountLoading ? (
                <ActivityIndicator size="small" color={COLORS.bg} />
              ) : (
                <Text style={styles.linkBtnText}>紐付ける</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.skipNote}>
              スキップしてもあとから設定画面で紐付けできます
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 0: return renderFamilyStep();
      case 1: return renderRegionStep();
      case 2: return renderPlanStep();
      case 3: return renderShareStep();
      case 4: return renderAccountStep();
      default: return null;
    }
  };

  // ── サマリー計算 ──
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
        {STEPS.map((s, i) => (
          <React.Fragment key={s.key}>
            {i > 0 && <View style={styles.indicatorLine} />}
            <View style={styles.indicatorContainer}>
              <View style={[styles.indicatorDot, i === step && styles.indicatorDotActive, i < step && styles.indicatorDotDone]} />
              <Text style={[styles.indicatorLabel, i === step && styles.indicatorLabelActive]}>
                {s.label}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* サマリーバー（ステップ1以降で表示） */}
      {step >= 1 && (
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
        {renderStep()}

        {/* ナビゲーションボタン */}
        <View style={styles.buttonRow}>
          {step > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
              <Text style={styles.backButtonText}>戻る</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={goNext}>
            <Text style={styles.primaryButtonText}>
              {isLastStep ? 'はじめる' : '次へ'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* スキップ（ステップ2以降） */}
        {step >= 2 && !isLastStep && (
          <TouchableOpacity style={styles.skipButton} onPress={goNext}>
            <Text style={styles.skipButtonText}>スキップ</Text>
          </TouchableOpacity>
        )}
        {isLastStep && (
          <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
            <Text style={styles.skipButtonText}>スキップしてはじめる</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, letterSpacing: 0.5 },
  headerSub: { fontSize: 10, color: COLORS.textSub, marginTop: 1 },

  // ── ステップインジケーター ──
  indicatorRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, backgroundColor: COLORS.card,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 10,
  },
  indicatorContainer: { alignItems: 'center', gap: 3 },
  indicatorDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  indicatorDotActive: { backgroundColor: COLORS.accent, width: 10, height: 10, borderRadius: 5 },
  indicatorDotDone: { backgroundColor: COLORS.accent + '60' },
  indicatorLabel: { fontSize: 8, color: COLORS.textSub },
  indicatorLabelActive: { color: COLORS.accent, fontWeight: '700' },
  indicatorLine: { width: 20, height: 2, backgroundColor: COLORS.border, marginHorizontal: 4, marginBottom: 12 },

  // ── サマリーバー ──
  summaryBar: {
    backgroundColor: COLORS.accent + '15', paddingVertical: 6, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.accent + '30',
  },
  summaryText: { fontSize: 10, color: COLORS.accent, fontWeight: '600', textAlign: 'center' },

  // ── コンテンツ ──
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 40 },
  stepContainer: { flex: 1 },
  stepHeader: { alignItems: 'center', marginBottom: 16 },
  stepEmoji: { fontSize: 36, marginBottom: 8 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  stepDesc: { fontSize: 11, color: COLORS.textSub, textAlign: 'center', lineHeight: 16 },
  contentCard: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },

  // ── 家族構成 ──
  membersList: { marginBottom: 12 },
  memberCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.bg, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 6,
  },
  memberLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  memberIcon: { fontSize: 24, marginRight: 10 },
  memberInfo: { flex: 1 },
  memberLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  memberDetails: { fontSize: 10, color: COLORS.textSub },
  addMemberButton: {
    backgroundColor: COLORS.accent + '20', borderRadius: 8, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.accent + '40', borderStyle: 'dashed',
  },
  addMemberButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.accent },
  typePicker: {
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, marginBottom: 6, marginTop: -2, overflow: 'hidden',
  },
  typeOption: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, borderWidth: 1, borderColor: 'transparent',
  },
  typeOptionLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text },
  typeOptionSub: { fontSize: 9, color: COLORS.textSub },
  deleteOption: { paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center', backgroundColor: COLORS.textSub + '10' },
  deleteOptionText: { fontSize: 11, color: COLORS.textSub, fontWeight: '600' },

  // ── 地域 ──
  regionOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12,
  },
  regionContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  regionIcon: { fontSize: 18, marginRight: 8 },
  regionInfo: { flex: 1 },
  regionName: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  regionAreas: { fontSize: 9, color: COLORS.textSub },
  regionDaysNum: { fontSize: 13, fontWeight: '700' },
  regionDaysSub: { fontSize: 8, color: COLORS.textSub },
  sourceText: { fontSize: 8, color: COLORS.textSub, marginTop: 8 },

  // ── プラン ──
  planCard: {
    backgroundColor: COLORS.bg, borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  planCardSelected: { borderColor: COLORS.accent, borderWidth: 2, backgroundColor: COLORS.accent + '10' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  planName: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  planPrice: { fontSize: 11, color: COLORS.textSub },
  planFeature: { fontSize: 10, color: COLORS.textSub, marginBottom: 2 },
  upgradeBtn: {
    backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 12,
  },
  upgradeBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },

  // ── 家族共有 ──
  codeBox: {
    backgroundColor: COLORS.bg, borderRadius: 8, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  codeLabel: { fontSize: 9, color: COLORS.textSub, marginBottom: 4 },
  codeValue: { fontSize: 24, fontWeight: '800', color: COLORS.accent, letterSpacing: 4 },
  shareCodeBtn: {
    borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginBottom: 6,
  },
  shareCodeBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.accent },
  shareNote: { fontSize: 9, color: COLORS.textSub, textAlign: 'center' },
  createFamilyBtn: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  createFamilyBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.bg },
  orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  orText: { marginHorizontal: 10, fontSize: 10, color: COLORS.textSub },
  joinLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  codeInput: {
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 14, fontSize: 18, fontWeight: '700',
    color: COLORS.text, textAlign: 'center', letterSpacing: 4,
  },
  joinBtn: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  joinBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.bg },

  // ── アカウント ──
  accountInput: {
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12, fontSize: 13, color: COLORS.text,
  },
  linkBtn: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  linkBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.bg },
  linkedBox: {
    backgroundColor: COLORS.accent + '15', borderRadius: 8, padding: 14, alignItems: 'center',
  },
  linkedIcon: { fontSize: 24, color: COLORS.accent, marginBottom: 4 },
  linkedText: { fontSize: 12, fontWeight: '600', color: COLORS.accent, marginBottom: 4 },
  linkedEmail: { fontSize: 11, color: COLORS.textSub },
  skipNote: { fontSize: 9, color: COLORS.textSub, textAlign: 'center', marginTop: 8 },

  // ── 共通 ──
  btnDisabled: { opacity: 0.4 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  primaryButton: { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 0.5 },
  backButton: {
    borderRadius: 10, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card,
  },
  backButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.textSub },
  skipButton: { paddingVertical: 12, alignItems: 'center' },
  skipButtonText: { fontSize: 12, color: COLORS.textSub },
});
