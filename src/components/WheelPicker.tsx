import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { COLORS } from '../constants/colors';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3;

interface WheelPickerProps {
  items: { label: string; value: number }[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  width?: number;
}

export const WheelPicker = ({
  items,
  selectedValue,
  onValueChange,
  width = 80,
}: WheelPickerProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const initialIdx = Math.max(0, items.findIndex((i) => i.value === selectedValue));

  useEffect(() => {
    const idx = items.findIndex((i) => i.value === selectedValue);
    if (idx >= 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
      }, 50);
    }
  }, [selectedValue]);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.round(y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      if (items[clamped].value !== selectedValue) {
        onValueChange(items[clamped].value);
      }
    },
    [items, selectedValue, onValueChange]
  );

  return (
    <View style={[styles.container, { width, height: ITEM_HEIGHT * VISIBLE_ITEMS }]}>
      {/* 選択ハイライト */}
      <View style={styles.highlight} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT, // 上下1アイテム分のパディング
        }}
        onMomentumScrollEnd={handleMomentumEnd}
        contentOffset={{ x: 0, y: Math.max(0, initialIdx) * ITEM_HEIGHT }}
      >
        {items.map((item, i) => (
          <View key={i} style={styles.item}>
            <Text
              style={[
                styles.itemText,
                item.value === selectedValue && styles.itemTextSelected,
              ]}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.accent + '66',
    backgroundColor: COLORS.accent + '10',
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 16,
    color: COLORS.textSub,
  },
  itemTextSelected: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 18,
  },
});
