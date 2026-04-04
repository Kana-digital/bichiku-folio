import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { SECTORS } from '../constants/sectors';
import { calcScore, getMemberKcal, getMemberWater } from '../utils/scoring';
import { daysUntil } from '../utils/date';
import { JP_AVG } from '../constants/jpAvg';
import { StockItem, Member } from '../types';

interface HomeScreenProps {
  items: StockItem[];
  members: Member[];
  regionDays: number;
  onAddPress: () => void;
  onConsumePress: () => void;
}

interface PieSegment {
  id: string;
  name: string;
  icon: string;
  color: string;
  value: number;
  pct: number;
  targetRatio: number;
}

const createPieSlice = (
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
  cx: number,
  cy: number
): string => {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  const x1 = cx + outerRadius * Math.cos(startRad);
  const y1 = cy + outerRadius * Math.sin(startRad);
  const x2 = cx + outerRadius * Math.cos(endRad);
  const y2 = cy + outerRadius * Math.sin(endRad);
  const x3 = cx + innerRadius * Math.cos(endRad);
  const y3 = cy + innerRadius * Math.sin(endRad);
  const x4 = cx + innerRadius * Math.cos(startRad);
  const y4 = cy + innerRadius * Math.sin(startRad);

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
};

export const HomeScreen = ({
  items,
  members,
  regionDays,
  onAddPress,
  onConsumePress,
}: HomeScreenProps) => {
  const sc = useMemo(() => calcScore(items, members, regionDays), [items, members, regionDays]);
  const scoreCol =
    sc.total >= 70 ? COLORS.green : sc.total >= 40 ? COLORS.yellow : COLORS.red;

  const pieData = useMemo(() => {
    const data = SECTORS.map((s) => {
      const v = items
        .filter((i) => i.sec === s.id)
        .reduce((a, i) => a + i.qty * i.kcal, 0);
      return {
        ...s,
        value: v,
        pct: sc.totalKcal > 0 ? ((v / sc.totalKcal) * 100) : 0,
      };
    }).filter((d) => d.value > 0);
    return data;
  }, [items, sc]);

  const sectorData = useMemo(() => {
    return SECTORS.map((s) => {
      const si = items.filter((i) => i.sec === s.id);
      const k = si.reduce((a, i) => a + i.qty * i.kcal, 0);
      const w = si.reduce((a, i) => a + i.qty * i.waterL, 0);
      // 配分比（表示用）
      const p = sc.totalKcal > 0 ? (k / sc.totalKcal) * 100 : 0;
      const totalQty = si.reduce((a, i) => a + i.qty, 0);
      // 目標に対する達成率（タグ判定用）
      // 品目数ベース / 水量ベース / カロリーベースを分岐
      const isDrink = s.id === 'drink';
      const isItemBased = !!s.targetItemsPerPerson;
      const targetItems = isItemBased ? (s.targetItemsPerPerson ?? 0) * sc.familySize : 0;
      const sectorTarget = isItemBased ? targetItems : isDrink ? sc.reqWater : sc.reqKcal * s.targetRatio;
      const sectorCurrent = isItemBased ? totalQty : isDrink ? w : k;
      const achievePct = sectorTarget > 0 ? (sectorCurrent / sectorTarget) * 100 : 0;
      const targetLabel = isItemBased
        ? `${targetItems}品目`
        : isDrink
        ? `${sectorTarget.toFixed(1)}L`
        : `${Math.round(sectorTarget).toLocaleString()}kcal`;
      const hasItems = si.length > 0;
      const tag =
        achievePct >= 100
          ? { text: '達成', col: COLORS.green }
          : achievePct >= 50
          ? { text: 'あと少し', col: COLORS.yellow }
          : hasItems
          ? { text: '不足', col: COLORS.red }
          : { text: '未登録', col: COLORS.textSub };
      const nearExpiry = si.filter((i) => {
        const d = daysUntil(i.expiry);
        return d > 0 && d <= 30;
      }).length;
      const expired = si.filter((i) => daysUntil(i.expiry) <= 0).length;
      return {
        ...s,
        items: si,
        kcal: k,
        waterL: w,
        pct: p,
        sectorTarget,
        achievePct,
        targetLabel,
        tag,
        nearExpiry,
        expired,
        count: si.length,
        totalQty,
      };
    });
  }, [items, sc]);

  const [openSector, setOpenSector] = useState<string | null>(null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.scoreCards}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreCardLabel}>備蓄スコア</Text>
          <Text style={[styles.scoreCardValue, { color: scoreCol }]}>
            {sc.total}
            <Text style={styles.scoreCardUnit}>/100</Text>
          </Text>
          <Text style={styles.scoreCardDesc}>
            量の充足度、栄養バランス、{'\n'}期限の分散度から算出
          </Text>
        </View>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreCardLabel}>備蓄数量</Text>
          <Text style={[styles.scoreCardValue, { color: COLORS.accent }]}>
            {sc.userDays.toFixed(1)}
            <Text style={styles.scoreCardUnit}>日分</Text>
          </Text>
          <Text
            style={[
              styles.scoreCardSmall,
              { color: sc.vsAvgDays >= 0 ? COLORS.green : COLORS.textSub },
            ]}
          >
            全国平均 {JP_AVG.avgDays}日（{sc.vsAvgDays >= 0 ? '+' : ''}
            {sc.vsAvgDays.toFixed(1)}日）
          </Text>
          <Text
            style={[
              styles.scoreCardSmall,
              { color: sc.userDays >= regionDays ? COLORS.green : COLORS.textSub },
            ]}
          >
            内閣府推奨 {regionDays}日（{sc.userDays >= regionDays ? '+' : ''}
            {(sc.userDays - regionDays).toFixed(1)}日）
          </Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
          <Text style={styles.buttonText}>+ 追加</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.consumeButton} onPress={onConsumePress}>
          <Text style={styles.buttonText}>消費</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>内訳</Text>
          <Text style={styles.chartSubtitle}>カロリーベース配分</Text>
        </View>
        {pieData.length > 0 ? (
          <View style={styles.chartContainer}>
            <Svg width="100%" height={240} viewBox="0 0 200 240">
              {pieData.reduce((acc, d, idx) => {
                const prevAngle = acc.length === 0 ? 0 : acc[acc.length - 1].endAngle;
                const angle = (d.value / sc.totalKcal) * 360;
                const endAngle = prevAngle + angle;
                const midAngle = (prevAngle + endAngle) / 2;
                const midRad = (midAngle * Math.PI) / 180;

                const path = createPieSlice(
                  prevAngle,
                  endAngle,
                  45,
                  75,
                  100,
                  100
                );

                const labelR = 85;
                const labelX = 100 + labelR * Math.cos(midRad);
                const labelY = 100 + labelR * Math.sin(midRad);

                acc.push({
                  ...d,
                  path,
                  labelX,
                  labelY,
                  endAngle,
                  textAnchor: labelX > 100 ? 'start' : 'end',
                });
                return acc;
              }, [] as any[]).map((d, idx) => (
                <G key={idx}>
                  <Path d={d.path} fill={d.color} />
                  <SvgText
                    x={d.labelX}
                    y={d.labelY}
                    textAnchor={d.textAnchor}
                    fontSize="10"
                    fill={COLORS.text}
                  >
                    {d.icon} {d.name} {d.pct.toFixed(1)}%
                  </SvgText>
                </G>
              ))}
              <SvgText
                x="100"
                y="95"
                textAnchor="middle"
                fontSize="18"
                fontWeight="800"
                fill={COLORS.text}
              >
                {sc.totalKcal.toLocaleString()}
              </SvgText>
              <SvgText
                x="100"
                y="110"
                textAnchor="middle"
                fontSize="9"
                fill={COLORS.textSub}
              >
                kcal
              </SvgText>
              <SvgText
                x="100"
                y="122"
                textAnchor="middle"
                fontSize="7"
                fill={COLORS.textSub}
              >
                目標{sc.reqKcal.toLocaleString()}kcal
              </SvgText>
            </Svg>
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartText}>商品を追加するとグラフが表示されます</Text>
          </View>
        )}
      </View>

      {sectorData.map((s) => {
        const isOpen = openSector === s.id;
        return (
          <View key={s.id} style={styles.sectorItem}>
            <TouchableOpacity
              style={[
                styles.sectorButton,
                {
                  backgroundColor: isOpen ? s.color + '12' : COLORS.card,
                  borderColor: isOpen ? s.color + '44' : COLORS.border,
                  borderTopLeftRadius: isOpen ? 12 : 12,
                  borderTopRightRadius: isOpen ? 12 : 12,
                  borderBottomLeftRadius: isOpen ? 0 : 12,
                  borderBottomRightRadius: isOpen ? 0 : 12,
                },
              ]}
              onPress={() => setOpenSector(isOpen ? null : s.id)}
            >
              <View style={styles.sectorContent}>
                <Text style={styles.sectorIcon}>{s.icon}</Text>
                <View style={styles.sectorInfo}>
                  <Text style={styles.sectorName}>{s.name}</Text>
                  <Text style={styles.sectorDetails}>
                    {s.count}品目 · {s.totalQty}個
                    {s.kcal > 0 ? ` · ${s.kcal.toLocaleString()}kcal` : ''}
                    {s.waterL > 0 ? ` · ${s.waterL.toFixed(1)}L` : ''}
                  </Text>
                  <Text style={styles.sectorTargetLabel}>
                    目標 {s.targetLabel}
                  </Text>
                </View>
              </View>
              <View style={styles.sectorRight}>
                <Text style={[styles.sectorPct, { color: s.color }]}>
                  {s.pct.toFixed(1)}%
                </Text>
                <Text
                  style={[
                    styles.sectorTag,
                    { color: s.tag.col, backgroundColor: s.tag.col + '18' },
                  ]}
                >
                  {s.tag.text}
                </Text>
                <Text style={[styles.sectorChevron, { transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }]}>
                  ▼
                </Text>
              </View>
            </TouchableOpacity>
            {isOpen && (
              <View
                style={[
                  styles.sectorExpanded,
                  {
                    borderColor: s.color + '33',
                    borderBottomLeftRadius: 12,
                    borderBottomRightRadius: 12,
                  },
                ]}
              >
                <View style={styles.sectorBar}>
                  <View
                    style={{
                      width: `${Math.min(100, s.achievePct)}%`,
                      height: '100%',
                      backgroundColor: s.tag.col,
                      borderRadius: 4,
                    }}
                  />
                </View>
                <Text style={styles.barLabel}>
                  達成率 {s.achievePct.toFixed(1)}%（{s.targetItemsPerPerson ? `${s.totalQty}個 / ${s.targetLabel}` : s.id === 'drink' ? `${s.waterL.toFixed(1)}L / ${s.targetLabel}` : `${s.kcal.toLocaleString()} / ${s.targetLabel}`}）
                </Text>
                {/* 品目リスト */}
                {s.items.length > 0 && (
                  <View style={styles.itemsList}>
                    {s.items.map((item) => {
                      const isNoExpiry = item.expiry === '9999-12-31';
                      const d = daysUntil(item.expiry);
                      const col = isNoExpiry ? COLORS.textSub : d <= 0 ? COLORS.red : d <= 30 ? COLORS.yellow : COLORS.textSub;
                      return (
                        <View key={item.id} style={styles.itemRow}>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.itemQty}>x{item.qty}</Text>
                          <Text style={[styles.itemExpiry, { color: col }]}>
                            {isNoExpiry ? '期限なし' : d <= 0 ? '期限切れ' : d <= 30 ? `あと${d}日` : item.expiry.replace(/-/g, '/')}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                {(s.nearExpiry > 0 || s.expired > 0) && (
                  <View style={styles.alertContainer}>
                    {s.expired > 0 && (
                      <Text style={[styles.alertText, { color: COLORS.red }]}>
                        期限切れ {s.expired}個
                      </Text>
                    )}
                    {s.nearExpiry > 0 && (
                      <Text style={[styles.alertText, { color: COLORS.yellow }]}>
                        そろそろ消費 {s.nearExpiry}個
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  scoreCards: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scoreCardLabel: {
    fontSize: 9,
    color: COLORS.textSub,
  },
  scoreCardValue: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  scoreCardUnit: {
    fontSize: 11,
    color: COLORS.textSub,
    fontWeight: '400',
  },
  scoreCardDesc: {
    fontSize: 8,
    color: COLORS.textSub,
    marginTop: 2,
    lineHeight: 11,
  },
  scoreCardSmall: {
    fontSize: 9,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  addButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 10,
  },
  consumeButton: {
    flex: 1,
    backgroundColor: COLORS.blue,
    borderRadius: 10,
    paddingVertical: 10,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.bg,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  chartSubtitle: {
    fontSize: 9,
    color: COLORS.textSub,
  },
  chartContainer: {
    width: '100%',
    height: 240,
  },
  emptyChart: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 12,
    color: COLORS.textSub,
  },
  sectorItem: {
    marginBottom: 6,
  },
  sectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  sectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectorIcon: {
    fontSize: 22,
  },
  sectorInfo: {
    flex: 1,
  },
  sectorName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectorDetails: {
    fontSize: 10,
    color: COLORS.textSub,
  },
  sectorTargetLabel: {
    fontSize: 8,
    color: COLORS.textSub,
    marginTop: 1,
  },
  sectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectorStats: {
    alignItems: 'flex-end',
  },
  sectorPct: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectorTarget: {
    fontSize: 9,
    color: COLORS.textSub,
  },
  sectorTag: {
    fontSize: 9,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  sectorChevron: {
    fontSize: 10,
    color: COLORS.textSub,
  },
  sectorExpanded: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderTopWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sectorBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.bg,
    marginBottom: 3,
  },
  barBackground: {
    height: '100%',
  },
  barFill: {
    height: '100%',
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 9,
    color: COLORS.textSub,
  },
  itemsList: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    gap: 6,
  },
  itemName: {
    flex: 1,
    fontSize: 11,
    color: COLORS.text,
  },
  itemQty: {
    fontSize: 10,
    color: COLORS.textSub,
    minWidth: 24,
    textAlign: 'right',
  },
  itemExpiry: {
    fontSize: 9,
    minWidth: 60,
    textAlign: 'right',
  },
  alertContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    gap: 4,
  },
  alertText: {
    fontSize: 9,
    fontWeight: '600',
  },
});
