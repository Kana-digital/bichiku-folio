import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  FlatList,
  ListRenderItem,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { SECTORS } from '../constants/sectors';
import { daysUntil } from '../utils/date';
import { kataToHira, hiraToKata } from '../utils/kana';
import { StockItem } from '../types';

interface ConsumeModalProps {
  visible: boolean;
  items: StockItem[];
  onClose: () => void;
  onSubmit: (itemId: number, qty: number) => void;
}

export const ConsumeModal = ({
  visible,
  items,
  onClose,
  onSubmit,
}: ConsumeModalProps) => {
  const [search, setSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [consumeQty, setConsumeQty] = useState('1');

  const consumable = useMemo(
    () =>
      items
        .filter((i) => i.qty > 0)
        .sort((a, b) => daysUntil(a.expiry) - daysUntil(b.expiry)),
    [items]
  );

  const filtered = useMemo(() => {
    if (!search) return consumable;
    const q = search.toLowerCase();
    const qHira = kataToHira(q);
    const qKata = hiraToKata(q);
    return consumable.filter((i) => {
      const n = i.name.toLowerCase();
      const nHira = kataToHira(n);
      const nKata = hiraToKata(n);
      return (
        n.includes(q) ||
        n.includes(qHira) ||
        n.includes(qKata) ||
        nHira.includes(qHira) ||
        nKata.includes(qKata)
      );
    });
  }, [search, consumable]);

  const selectedItem = consumable.find((i) => i.id === selectedItemId);

  const handleSubmit = () => {
    if (!selectedItemId) return;
    onSubmit(selectedItemId, Number(consumeQty) || 1);
    setSearch('');
    setSelectedItemId(null);
    setConsumeQty('1');
  };

  const renderItem: ListRenderItem<StockItem> = ({ item }) => {
    const sec = SECTORS.find((s) => s.id === item.sec);
    const d = daysUntil(item.expiry);
    const isSelected = selectedItemId === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.itemButton,
          {
            backgroundColor: isSelected ? COLORS.accent + '20' : COLORS.bg,
            borderColor: isSelected ? COLORS.accent : COLORS.border,
          },
        ]}
        onPress={() => setSelectedItemId(item.id)}
      >
        <View style={styles.itemContent}>
          <Text style={styles.itemIcon}>{sec?.icon}</Text>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemDetails}>x{item.qty}</Text>
          </View>
        </View>
        <View style={styles.itemExpiry}>
          <Text style={styles.expiryDate}>{item.expiry.replace(/-/g, '/')}</Text>
          <Text style={styles.daysLeft}>{d > 0 ? `あと${d}日` : '期限切れ'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>商品を消費</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.searchSection}>
              <TextInput
                style={styles.searchInput}
                placeholder="商品を検索"
                placeholderTextColor={COLORS.textSub}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <Text style={styles.listLabel}>在庫一覧</Text>
            <FlatList
              data={filtered}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              style={styles.itemsList}
            />

            {selectedItem && (
              <View style={styles.selectedSection}>
                <Text style={styles.selectedLabel}>消費数量</Text>
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    style={styles.qtyButton}
                    onPress={() => setConsumeQty(Math.max(1, Number(consumeQty) - 1).toString())}
                  >
                    <Text style={styles.qtyButtonText}>-</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.qtyInput}
                    placeholder="1"
                    placeholderTextColor={COLORS.textSub}
                    value={consumeQty}
                    onChangeText={setConsumeQty}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity
                    style={styles.qtyButton}
                    onPress={() =>
                      setConsumeQty(
                        Math.min(selectedItem.qty, Number(consumeQty) + 1).toString()
                      )
                    }
                  >
                    <Text style={styles.qtyButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.maxLabel}>
                  最大 {selectedItem.qty}個まで
                </Text>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmit}
                >
                  <Text style={styles.submitButtonText}>消費</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.textSub,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchInput: {
    width: '100%',
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  listLabel: {
    fontSize: 11,
    color: COLORS.textSub,
    marginBottom: 8,
    fontWeight: '600',
  },
  itemsList: {
    marginBottom: 16,
  },
  itemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 10,
    color: COLORS.textSub,
  },
  itemExpiry: {
    alignItems: 'flex-end',
  },
  expiryDate: {
    fontSize: 10,
    color: COLORS.textSub,
  },
  daysLeft: {
    fontSize: 9,
    color: COLORS.textSub,
  },
  selectedSection: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  selectedLabel: {
    fontSize: 11,
    color: COLORS.textSub,
    marginBottom: 8,
    fontWeight: '600',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  qtyButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  qtyInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    textAlign: 'center',
  },
  maxLabel: {
    fontSize: 9,
    color: COLORS.textSub,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: COLORS.blue,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.bg,
    textAlign: 'center',
  },
});
