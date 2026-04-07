import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ListRenderItem,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { ItemRow } from '../components/ItemRow';
import { daysUntil } from '../utils/date';
import { kataToHira, hiraToKata } from '../utils/kana';
import { StockItem } from '../types';

interface ListScreenProps {
  items: StockItem[];
  onConsume: (id: number, qty: number) => void;
  onEdit: (item: StockItem) => void;
}

interface Section {
  key: string;
  title: string;
  color: string;
  bgColor: string;
  data: StockItem[];
}

export const ListScreen = ({ items, onConsume, onEdit }: ListScreenProps) => {
  const [search, setSearch] = useState('');

  // フィルタリング（かな/カナ変換対応）
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    const qHira = kataToHira(q);
    const qKata = hiraToKata(q);
    return items.filter((item) => {
      const n = item.name.toLowerCase();
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
  }, [items, search]);

  // グループ分け
  const sections = useMemo(() => {
    const expired: StockItem[] = [];
    const nearExpiry: StockItem[] = [];
    const safe: StockItem[] = [];

    const noExpiry: StockItem[] = [];
    filtered.forEach((item) => {
      const expiry = item.expiry ?? '9999-12-31';
      if (expiry === '9999-12-31') { noExpiry.push(item); return; }
      const d = daysUntil(expiry);
      if (d <= 0) expired.push(item);
      else if (d <= 30) nearExpiry.push(item);
      else safe.push(item);
    });

    const sortByExpiry = (a: StockItem, b: StockItem) =>
      daysUntil(a.expiry ?? '9999-12-31') - daysUntil(b.expiry ?? '9999-12-31');
    expired.sort(sortByExpiry);
    nearExpiry.sort(sortByExpiry);
    safe.sort(sortByExpiry);

    const result: Section[] = [];
    if (expired.length > 0) {
      result.push({
        key: 'expired',
        title: `期限切れ (${expired.length})`,
        color: COLORS.red,
        bgColor: COLORS.red + '10',
        data: expired,
      });
    }
    if (nearExpiry.length > 0) {
      result.push({
        key: 'near',
        title: `そろそろ消費 (${nearExpiry.length})`,
        color: COLORS.yellow,
        bgColor: COLORS.yellow + '10',
        data: nearExpiry,
      });
    }
    if (safe.length > 0) {
      result.push({
        key: 'safe',
        title: `ストック中 (${safe.length})`,
        color: COLORS.green,
        bgColor: COLORS.green + '10',
        data: safe,
      });
    }
    if (noExpiry.length > 0) {
      result.push({
        key: 'noexpiry',
        title: `期限なし (${noExpiry.length})`,
        color: COLORS.textSub,
        bgColor: COLORS.textSub + '10',
        data: noExpiry,
      });
    }
    return result;
  }, [filtered]);

  // FlatListのデータ: セクションヘッダー + アイテムを1次元配列に
  type ListItem = { type: 'header'; section: Section } | { type: 'item'; item: StockItem };

  const listData = useMemo(() => {
    const data: ListItem[] = [];
    sections.forEach((section) => {
      data.push({ type: 'header', section });
      section.data.forEach((item) => {
        data.push({ type: 'item', item });
      });
    });
    return data;
  }, [sections]);

  const renderListItem = useCallback(
    ({ item: row }: { item: ListItem }) => {
      if (row.type === 'header') {
        return (
          <View style={[styles.sectionHeader, { backgroundColor: row.section.bgColor }]}>
            <Text style={[styles.sectionTitle, { color: row.section.color }]}>
              {row.section.title}
            </Text>
          </View>
        );
      }
      return <ItemRow item={row.item} onConsume={onConsume} onEdit={onEdit} />;
    },
    [onConsume, onEdit]
  );

  const keyExtractor = useCallback((item: ListItem, index: number) => {
    if (item.type === 'header') return `header-${item.section.key}`;
    return `item-${item.item.id}`;
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* 検索バー */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 商品名で検索"
          placeholderTextColor={COLORS.textSub}
          value={search}
          onChangeText={setSearch}
          autoCorrect={true}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Text style={styles.resultCount}>
            {filtered.length}件
          </Text>
        )}
      </View>

      {/* リスト */}
      <FlatList
        data={listData}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={listData.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              {search ? '🔍' : '📦'}
            </Text>
            <Text style={styles.emptyText}>
              {search
                ? `「${search}」に一致する商品がありません`
                : '商品がまだありません'}
            </Text>
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  resultCount: {
    fontSize: 11,
    color: COLORS.textSub,
    fontWeight: '600',
  },
  section: {
    marginBottom: 0,
  },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textSub,
    textAlign: 'center',
  },
});
