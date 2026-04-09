/**
 * 家族グループ管理セクション
 *
 * SettingsScreen に埋め込んで使用。
 * - グループ未参加: 「グループを作成」or「招待コードで参加」
 * - グループ参加中: 招待コード表示、メンバー数、脱退ボタン
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { FamilyGroup } from '../services/familyService';

interface FamilySectionProps {
  uid: string | null;
  family: FamilyGroup | null;
  isSyncing: boolean;
  onCreateFamily: () => Promise<FamilyGroup | null>;
  onJoinFamily: (code: string) => Promise<{ success: boolean; error?: string }>;
  onLeaveFamily: () => Promise<boolean>;
}

export const FamilySection = ({
  uid,
  family,
  isSyncing,
  onCreateFamily,
  onJoinFamily,
  onLeaveFamily,
}: FamilySectionProps) => {
  const [inviteInput, setInviteInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);

  const handleCreate = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await onCreateFamily();
      if (result) {
        Alert.alert(
          'グループを作成しました',
          `招待コード: ${result.inviteCode}\n\nこのコードを家族に共有して、同じグループに参加してもらいましょう。`,
        );
      } else {
        Alert.alert('エラー', 'グループの作成に失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
  }, [onCreateFamily]);

  const handleJoin = useCallback(async () => {
    const code = inviteInput.trim();
    if (code.length < 6) {
      Alert.alert('入力エラー', '6桁の招待コードを入力してください');
      return;
    }
    setIsLoading(true);
    try {
      const result = await onJoinFamily(code);
      if (result.success) {
        Alert.alert('参加しました', '家族グループに参加しました。データが同期されます。');
        setInviteInput('');
        setShowJoinInput(false);
      } else {
        Alert.alert('エラー', result.error ?? '参加に失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
  }, [inviteInput, onJoinFamily]);

  const handleLeave = useCallback(() => {
    Alert.alert(
      'グループから脱退',
      'グループから脱退すると、データの同期が停止します。ローカルのデータはそのまま残ります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '脱退する',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const ok = await onLeaveFamily();
              if (!ok) Alert.alert('エラー', '脱退に失敗しました');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  }, [onLeaveFamily]);

  const handleShareCode = useCallback(async () => {
    if (!family) return;
    try {
      await Share.share({
        message: `ビチクフォリオの家族グループに参加しよう!\n招待コード: ${family.inviteCode}`,
      });
    } catch {}
  }, [family]);

  if (!uid) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>👨‍👩‍👧‍👦 家族で共有</Text>
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={styles.statusText}>認証中...</Text>
        </View>
      </View>
    );
  }

  // ── グループ参加中 ──
  if (family) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>👨‍👩‍👧‍👦 家族で共有</Text>

        <View style={styles.syncBadge}>
          <View style={[styles.syncDot, isSyncing && styles.syncDotActive]} />
          <Text style={styles.syncText}>
            {isSyncing ? 'リアルタイム同期中' : '同期待機中'}
          </Text>
        </View>

        {/* 招待コード表示 */}
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>招待コード</Text>
          <Text style={styles.codeValue}>{family.inviteCode}</Text>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
          <Text style={styles.shareButtonText}>📤 コードを共有</Text>
        </TouchableOpacity>

        <Text style={styles.memberCount}>
          グループメンバー: {family.members.length}人
        </Text>

        <TouchableOpacity style={styles.leaveButton} onPress={handleLeave} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.textSub} />
          ) : (
            <Text style={styles.leaveButtonText}>グループから脱退</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // ── グループ未参加 ──
  return (
    <View style={styles.container}>
      <Text style={styles.title}>👨‍👩‍👧‍👦 家族で共有</Text>
      <Text style={styles.subtitle}>
        家族グループを作成して、備蓄データをリアルタイムで共有しましょう
      </Text>

      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreate}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={COLORS.bg} />
        ) : (
          <Text style={styles.createButtonText}>+ グループを作成</Text>
        )}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>または</Text>
        <View style={styles.dividerLine} />
      </View>

      {showJoinInput ? (
        <View style={styles.joinSection}>
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
          <View style={styles.joinButtons}>
            <TouchableOpacity
              style={styles.joinCancelButton}
              onPress={() => { setShowJoinInput(false); setInviteInput(''); }}
            >
              <Text style={styles.joinCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.joinSubmitButton, inviteInput.length < 6 && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={isLoading || inviteInput.length < 6}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.bg} />
              ) : (
                <Text style={styles.joinSubmitText}>参加する</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => setShowJoinInput(true)}
        >
          <Text style={styles.joinButtonText}>招待コードで参加</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: COLORS.textSub,
    marginBottom: 12,
    lineHeight: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusText: {
    fontSize: 11,
    color: COLORS.textSub,
  },

  // ── 同期ステータス ──
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSub,
  },
  syncDotActive: {
    backgroundColor: COLORS.accent,
  },
  syncText: {
    fontSize: 10,
    color: COLORS.textSub,
  },

  // ── 招待コード表示 ──
  codeBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  codeLabel: {
    fontSize: 9,
    color: COLORS.textSub,
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 4,
  },

  // ── ボタン ──
  shareButton: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  shareButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  memberCount: {
    fontSize: 10,
    color: COLORS.textSub,
    textAlign: 'center',
    marginBottom: 10,
  },
  leaveButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  leaveButtonText: {
    fontSize: 11,
    color: COLORS.textSub,
  },

  // ── 未参加時 ──
  createButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.bg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 10,
    color: COLORS.textSub,
  },
  joinButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },

  // ── 参加フォーム ──
  joinSection: {
    gap: 8,
  },
  codeInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 4,
  },
  joinButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  joinCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  joinCancelText: {
    fontSize: 11,
    color: COLORS.textSub,
  },
  joinSubmitButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  joinSubmitText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.bg,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
