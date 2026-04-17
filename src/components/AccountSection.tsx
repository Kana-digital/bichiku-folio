/**
 * アカウント管理セクション
 *
 * - メールアドレス紐付け（アカウント復元用）
 * - 匿名ユーザーはメールリンク可能
 * - アカウント削除（App Store Guideline 5.1.1(v) 対応）
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
} from 'react-native';
import { COLORS } from '../constants/colors';
import { linkEmail, getCurrentUser } from '../services/authService';
import { deleteAccountFlow, reauthenticateAndDelete } from '../utils/accountDeletion';

interface AccountSectionProps {
  uid: string | null;
  /** アカウント削除後に呼ばれる（ステート初期化・新匿名サインイン） */
  onAccountDeleted?: () => Promise<void> | void;
}

export const AccountSection = ({ uid, onAccountDeleted }: AccountSectionProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // ── アカウント削除用 ──
  const [showDeleteReauth, setShowDeleteReauth] = useState(false);
  const [reauthEmail, setReauthEmail] = useState('');
  const [reauthPassword, setReauthPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const user = getCurrentUser();
  const isAnonymous = user?.isAnonymous ?? true;
  const linkedEmail = user?.email ?? null;

  const handleLink = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('入力エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }
    if (password.length < 6) {
      Alert.alert('入力エラー', 'パスワードは6文字以上にしてください');
      return;
    }

    setIsLoading(true);
    try {
      const result = await linkEmail(email.trim(), password);
      if (result.success) {
        setIsLinked(true);
        setShowForm(false);
        Alert.alert(
          'メールアドレスを紐付けました',
          '機種変更時にこのメールアドレスでアカウントを復元できます。',
        );
      } else {
        Alert.alert('エラー', result.error ?? '紐付けに失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password]);

  // ── アカウント削除 ──
  const executeDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAccountFlow();
      if (result.success) {
        Alert.alert(
          'アカウントを削除しました',
          'すべてのデータが削除されました。ご利用ありがとうございました。',
        );
        await onAccountDeleted?.();
      } else if (result.requiresReauth) {
        // 再認証が必要
        Alert.alert(
          '再認証が必要です',
          'セキュリティのため、アカウント削除にはパスワードの再入力が必要です。',
          [{ text: 'OK', onPress: () => setShowDeleteReauth(true) }],
        );
      } else {
        Alert.alert('エラー', result.error ?? 'アカウント削除に失敗しました');
      }
    } finally {
      setIsDeleting(false);
    }
  }, [onAccountDeleted]);

  const handleDeletePress = useCallback(() => {
    Alert.alert(
      'アカウントを削除しますか？',
      'この操作は取り消せません。\n\n' +
        '以下のデータがすべて削除されます：\n' +
        '・備蓄リスト\n' +
        '・家族構成・地域設定\n' +
        '・家族グループ（最後の1人の場合）\n' +
        '・ログイン情報（メール紐付け含む）\n\n' +
        '※ サブスクリプションは App Store / Google Play の設定画面から別途解約してください。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: executeDelete,
        },
      ],
    );
  }, [executeDelete]);

  const handleReauthAndDelete = useCallback(async () => {
    if (!reauthEmail.trim() || !reauthPassword.trim()) {
      Alert.alert('入力エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }

    setIsDeleting(true);
    try {
      const result = await reauthenticateAndDelete(reauthEmail.trim(), reauthPassword);
      if (result.success) {
        setShowDeleteReauth(false);
        setReauthEmail('');
        setReauthPassword('');
        Alert.alert(
          'アカウントを削除しました',
          'すべてのデータが削除されました。ご利用ありがとうございました。',
        );
        await onAccountDeleted?.();
      } else {
        Alert.alert('エラー', result.error ?? '削除に失敗しました');
      }
    } finally {
      setIsDeleting(false);
    }
  }, [reauthEmail, reauthPassword, onAccountDeleted]);

  if (!uid) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔑 アカウント</Text>

      {(linkedEmail || isLinked) && !isAnonymous ? (
        // メール紐付け済み
        <View style={styles.linkedInfo}>
          <Text style={styles.linkedLabel}>メールアドレス</Text>
          <Text style={styles.linkedEmail}>{linkedEmail ?? email}</Text>
          <Text style={styles.linkedNote}>
            機種変更時にこのメールアドレスでアカウントを復元できます
          </Text>
        </View>
      ) : showForm ? (
        // 紐付けフォーム
        <View style={styles.form}>
          <Text style={styles.formDesc}>
            メールアドレスを紐付けると、機種変更時にアカウントを復元できます
          </Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="メールアドレス"
            placeholderTextColor={COLORS.textSub}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="パスワード（6文字以上）"
            placeholderTextColor={COLORS.textSub}
            secureTextEntry
          />
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => { setShowForm(false); setEmail(''); setPassword(''); }}
            >
              <Text style={styles.cancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkButton, (!email.trim() || password.length < 6) && styles.buttonDisabled]}
              onPress={handleLink}
              disabled={isLoading || !email.trim() || password.length < 6}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.bg} />
              ) : (
                <Text style={styles.linkButtonText}>紐付ける</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // 未紐付け → 紐付けを促す
        <View>
          <Text style={styles.anonNote}>
            現在は匿名アカウントで利用中です。メールアドレスを紐付けると、機種変更時にデータを引き継げます。
          </Text>
          <TouchableOpacity style={styles.setupButton} onPress={() => setShowForm(true)}>
            <Text style={styles.setupButtonText}>メールアドレスを紐付ける</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── アカウント削除セクション ── */}
      <View style={styles.dangerSection}>
        {showDeleteReauth ? (
          <View style={styles.form}>
            <Text style={styles.dangerFormTitle}>再認証してアカウント削除</Text>
            <Text style={styles.formDesc}>
              セキュリティのため、紐付け済みメールアドレスとパスワードを再入力してください。
            </Text>
            <TextInput
              style={styles.input}
              value={reauthEmail}
              onChangeText={setReauthEmail}
              placeholder="メールアドレス"
              placeholderTextColor={COLORS.textSub}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isDeleting}
            />
            <TextInput
              style={styles.input}
              value={reauthPassword}
              onChangeText={setReauthPassword}
              placeholder="パスワード"
              placeholderTextColor={COLORS.textSub}
              secureTextEntry
              editable={!isDeleting}
            />
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowDeleteReauth(false);
                  setReauthEmail('');
                  setReauthPassword('');
                }}
                disabled={isDeleting}
              >
                <Text style={styles.cancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmButton, (!reauthEmail.trim() || !reauthPassword.trim()) && styles.buttonDisabled]}
                onPress={handleReauthAndDelete}
                disabled={isDeleting || !reauthEmail.trim() || !reauthPassword.trim()}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteConfirmButtonText}>認証して削除</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.dangerLabel}>危険な操作</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeletePress}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#E74C3C" />
              ) : (
                <Text style={styles.deleteButtonText}>アカウントを削除</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.deleteNote}>
              アカウントと全データを完全に削除します。この操作は取り消せません。
            </Text>
          </>
        )}
      </View>
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
    marginBottom: 8,
  },

  // ── 紐付け済み ──
  linkedInfo: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkedLabel: {
    fontSize: 9,
    color: COLORS.textSub,
    marginBottom: 2,
  },
  linkedEmail: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    marginBottom: 4,
  },
  linkedNote: {
    fontSize: 9,
    color: COLORS.textSub,
  },

  // ── フォーム ──
  form: {
    gap: 8,
  },
  formDesc: {
    fontSize: 10,
    color: COLORS.textSub,
    lineHeight: 15,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: COLORS.text,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 11,
    color: COLORS.textSub,
  },
  linkButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.bg,
  },
  buttonDisabled: {
    opacity: 0.4,
  },

  // ── 匿名ユーザー ──
  anonNote: {
    fontSize: 10,
    color: COLORS.textSub,
    lineHeight: 15,
    marginBottom: 8,
  },
  setupButton: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  setupButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // ── 危険ゾーン（アカウント削除） ──
  dangerSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dangerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSub,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dangerFormTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E74C3C',
    marginBottom: 4,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#E74C3C',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  deleteButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E74C3C',
  },
  deleteNote: {
    fontSize: 9,
    color: COLORS.textSub,
    marginTop: 6,
    lineHeight: 13,
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
});
