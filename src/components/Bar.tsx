import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

interface BarProps {
  pct: number;
  color: string;
  h?: number;
}

export const Bar = ({ pct, color, h = 8 }: BarProps) => {
  return (
    <View style={[styles.container, { height: h, borderRadius: h / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.min(100, pct)}%`,
            backgroundColor: color,
            borderRadius: h / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
    flex: 1,
  },
  fill: {
    height: '100%',
  },
});
