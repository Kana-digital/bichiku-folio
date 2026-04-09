/**
 * アカウント管理セクション
 *
 * - メールアドレス紐付け（アカウント復元用）
 * - 匿名ユーザーはメールリンク可能
 * - 既にメール紐付け済みの場合は表示のみ
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

interface AccountSectionProps {
  uid: string | null;
}

export const AccountSection = ({ uid }: AccountSectionProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [showForm, setShowForm] = useState(false);

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
});
