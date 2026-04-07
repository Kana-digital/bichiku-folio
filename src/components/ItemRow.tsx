import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { SECTORS } from '../constants/sectors';
import { daysUntil, statusColor } from '../utils/date';
import { StockItem } from '../types';

interface ItemRowProps {
  item: StockItem;
  onConsume?: (id: number, qty: number) => void;
  onEdit?: (item: StockItem) => void;
}

export const ItemRow = ({ item, onConsume, onEdit }: ItemRowProps) => {
  const sec = SECTORS.find((s) => s.id === item.sec);
  const expiry = item.expiry ?? '9999-12-31';
  const isNoExpiry = expiry === '9999-12-31';
  const d = daysUntil(expiry);
  const col = isNoExpiry ? COLORS.textSub : statusColor(d);

  return (
    <TouchableOpacity style={styles.container} onPress={() => onEdit?.(item)} activeOpacity={0.6}>
      <Text style={styles.icon}>{sec?.icon}</Text>
      <View style={styles.content}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.details}>
          {sec?.name} · x{item.qty}
          {item.kcal > 0 ? ` · ${(item.qty * item.kcal).toLocaleString()}kcal` : ''}
          {item.waterL > 0 ? ` · ${(item.qty * item.waterL).toFixed(1)}L` : ''}
        </Text>
      </View>
      <View style={styles.expirySection}>
        <Text style={styles.expiryLabel}>{isNoExpiry ? '' : '賞味期限'}</Text>
        <Text style={[styles.expiryDate, { color: col }]}>
          {isNoExpiry ? '期限なし' : expiry.replace(/-/g, '/')}
        </Text>
        {!isNoExpiry && (
          <Text style={[styles.daysLeft, { color: col }]}>
            {d > 0 ? `あと${d}日` : '期限切れ'}
          </Text>
        )}
      </View>
      {d <= 0 && onConsume ? (
        <TouchableOpacity
          style={[styles.button, { borderColor: COLORS.red + '55', backgroundColor: COLORS.red + '22' }]}
          onPress={() => onConsume(item.id, item.qty)}
        >
          <Text style={[styles.buttonText, { color: COLORS.red }]}>廃棄</Text>
        </TouchableOpacity>
      ) : d <= 30 && onConsume ? (
        <TouchableOpacity
          style={[styles.button, { borderColor: COLORS.accent + '55', backgroundColor: COLORS.accent + '15' }]}
          onPress={() => onConsume(item.id, 1)}
        >
          <Text style={[styles.buttonText, { color: COLORS.accent }]}>消費</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  details: {
    fontSize: 10,
    color: COLORS.textSub,
  },
  expirySection: {
    alignItems: 'flex-end',
    minWidth: 65,
  },
  expiryLabel: {
    fontSize: 9,
    color: COLORS.textSub,
  },
  expiryDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  daysLeft: {
    fontSize: 9,
  },
  button: {
    borderWidth: 1,
    borderRadius: 5,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  buttonText: {
    fontSize: 9,
    fontWeight: '600',
  },
});
