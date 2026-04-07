import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { Bar } from './Bar';

interface ScoreGaugeProps {
  score: number;
  label: string;
  max: number;
  color: string;
  sub?: string;
  onClick?: () => void;
}

export const ScoreGauge = ({
  score,
  label,
  max,
  color,
  sub,
  onClick,
}: ScoreGaugeProps) => {
  const pct = max > 0 ? ((score / max) * 100) : 0;
  const Component = onClick ? TouchableOpacity : View;

  return (
    <Component
      style={styles.container}
      onPress={onClick}
      activeOpacity={onClick ? 0.7 : 1}
    >
      <Text style={styles.label}>{label}</Text>
      <Bar pct={pct} color={color} />
      <Text style={[styles.percentage, { color }]}>
        {pct.toFixed(1)}
        <Text style={styles.percentageUnit}>%</Text>
      </Text>
      {sub && <Text style={styles.sub}>{sub}</Text>}
      {onClick && <Text style={[styles.detail, { color }]}>タップで詳細 →</Text>}
    </Component>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    color: COLORS.textSub,
    marginBottom: 4,
  },
  percentage: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  percentageUnit: {
    fontSize: 10,
    fontWeight: '400',
  },
  sub: {
    fontSize: 9,
    color: COLORS.textSub,
    marginTop: 1,
  },
  detail: {
    fontSize: 8,
    marginTop: 3,
    opacity: 0.7,
  },
});
