import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { COLORS } from '../constants/colors';

interface Message {
  id: number;
  date: string;
  title: string;
  body: string;
  type: 'promo' | 'info' | 'update';
}

const MESSAGES: Message[] = [
  {
    id: 1,
    date: '2026/04/03',
    title: '📢 ローリングストックのすすめ',
    body: '期限が近い食品は消費して新しいものに入れ替えましょう。「一覧」タブで期限順に確認できます。',
    type: 'info',
  },
  {
    id: 2,
    date: '2026/04/01',
    title: '🛒 春の備蓄強化キャンペーン',
    body: '4月は新年度スタート！パートナー企業の防災セットPROが10%OFFでご購入いただけます。',
    type: 'promo',
  },
  {
    id: 3,
    date: '2026/03/25',
    title: '🎉 ビチクフォリオへようこそ！',
    body: '備蓄管理をスマートに。まずは「+追加」ボタンから備蓄食品を登録してみましょう。',
    type: 'info',
  },
];

interface MessageInboxProps {
  visible: boolean;
  onClose: () => void;
}

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  promo: { label: 'PR', color: COLORS.accent },
  info: { label: 'お知らせ', color: COLORS.blue },
  update: { label: '更新', color: COLORS.green },
};

export const MessageInbox = ({ visible, onClose }: MessageInboxProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>📬 お知らせ</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.content}>
            {MESSAGES.map((msg) => {
              const badge = TYPE_BADGE[msg.type] || TYPE_BADGE.info;
              return (
                <View key={msg.id} style={styles.msgCard}>
                  <View style={styles.msgHeader}>
                    <Text style={[styles.msgBadge, { backgroundColor: badge.color + '22', color: badge.color }]}>
                      {badge.label}
                    </Text>
                    <Text style={styles.msgDate}>{msg.date}</Text>
                  </View>
                  <Text style={styles.msgTitle}>{msg.title}</Text>
                  <Text style={styles.msgBody}>{msg.body}</Text>
                </View>
              );
            })}
            <View style={{ height: 20 }} />
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
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.textSub,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  msgCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  msgBadge: {
    fontSize: 9,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    overflow: 'hidden',
  },
  msgDate: {
    fontSize: 9,
    color: COLORS.textSub,
  },
  msgTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  msgBody: {
    fontSize: 11,
    color: COLORS.textSub,
    lineHeight: 16,
  },
});
