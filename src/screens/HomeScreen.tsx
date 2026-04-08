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
import { CHART_SECTORS } from '../constants/chartSectors';
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

/**
 * ドーナツ型円グラフのスライスパスを生成
 * startAngle / endAngle: 度数（0 = 12時方向、時計回り）
 */
const createPieSlice = (
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
  cx: number,
  cy: number
): string => {
  const sweep = endAngle - startAngle;

  // 360度（完全なリング）の場合、SVGアークは始点=終点で描画不可。
  // 外周2半円 + 内周2半円で1つの閉じたドーナツを描く。
  if (sweep >= 359.9) {
    const oR = outerRadius;
    const iR = innerRadius;
    return [
      `M ${cx + oR} ${cy}`,
      `A ${oR} ${oR} 0 1 1 ${cx - oR} ${cy}`,
      `A ${oR} ${oR} 0 1 1 ${cx + oR} ${cy}`,
      `M ${cx + iR} ${cy}`,
      `A ${iR} ${iR} 0 1 0 ${cx - iR} ${cy}`,
      `A ${iR} ${iR} 0 1 0 ${cx + iR} ${cy}`,
      'Z',
    ].join(' ');
  }

  // 通常のスライス（12時方向始点: -90度オフセット）
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const sr = toRad(startAngle);
  const er = toRad(endAngle);

  const x1 = cx + outerRadius * Math.cos(sr);
  const y1 = cy + outerRadius * Math.sin(sr);
  const x2 = cx + outerRadius * Math.cos(er);
  const y2 = cy + outerRadius * Math.sin(er);
  const x3 = cx + innerRadius * Math.cos(er);
  const y3 = cy + innerRadius * Math.sin(er);
  const x4 = cx + innerRadius * Math.cos(sr);
  const y4 = cy + innerRadius * Math.sin(sr);

  const largeArc = sweep > 180 ? 1 : 0;

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
    // CHART_SECTORS に属するアイテムだけを集計（旧セクターIDの漏れを防ぐ）
    const chartSectorIds = new Set(CHART_SECTORS.map((cs) => cs.id));
    // デバッグ: 不明なセクターIDを検出
    const allKnown = new Set([...chartSectorIds, 'drink', 'bousai', 'seasoning']);
    const unknowns = items.filter((i) => !allKnown.has(i.sec));
    if (unknowns.length > 0) {
      console.log('[PieChart] 不明セクターID:', unknowns.map((i) => ({ name: i.name, sec: i.sec, kcal: i.kcal, qty: i.qty })));
    }
    const chartItems = items.filter((i) => chartSectorIds.has(i.sec));

    const data = CHART_SECTORS.map((cs) => {
      const v = chartItems
        .filter((i) => i.sec === cs.id)
        .reduce((a, i) => a + (i.qty ?? 0) * (i.kcal ?? 0), 0);
      return { ...cs, value: v };
    });

    // 分母 = 各セクターの value 合計（表示される全スライスの合計 → 必ず100%）
    const chartTotalKcal = data.reduce((s, d) => s + d.value, 0);

    const segments = data
      .map((d) => ({
        ...d,
        pct: chartTotalKcal > 0 ? (d.value / chartTotalKcal) * 100 : 0,
      }))
      .filter((d) => d.value > 0);

    return { segments, totalKcal: chartTotalKcal };
  }, [items]);

  const sectorData = useMemo(() => {
    // pieData と同じ分母を使う（100%になることを保証）
    const chartKcal = pieData.totalKcal;
    // pieData のパーセンテージをマップ化
    const piePctMap = new Map(pieData.segments.map((seg) => [seg.id, seg.pct]));
    return SECTORS.map((s) => {
      const si = items.filter((i) => i.sec === s.id);
      const k = si.reduce((a, i) => a + (i.qty ?? 0) * (i.kcal ?? 0), 0);
      const w = si.reduce((a, i) => a + (i.qty ?? 0) * (i.waterL ?? 0), 0);
      // 配分比（表示用）— pieDataと完全一致させる
      const p = piePctMap.get(s.id) ?? (chartKcal > 0 ? (k / chartKcal) * 100 : 0);
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
        const d = daysUntil(i.expiry ?? '9999-12-31');
        return d > 0 && d <= 30;
      }).length;
      const expired = si.filter((i) => daysUntil(i.expiry ?? '9999-12-31') <= 0).length;
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
  }, [items, sc, pieData]);

  const [openSector, setOpenSector] = useState<string | null>(null);
  const [selectedPie, setSelectedPie] = useState<string | null>(null);
  const selectedPieData = selectedPie ? pieData.segments.find((s) => s.id === selectedPie) : null;

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
          <Text style={styles.chartSubtitle}>食品カロリーベース配分</Text>
        </View>
        {pieData.segments.length > 0 ? (
          <TouchableOpacity activeOpacity={1} onPress={() => setSelectedPie(null)}>
            <View style={styles.chartContainer}>
              <Svg width="100%" height={240} viewBox="0 0 200 200">
                {pieData.segments.reduce((acc, d, idx) => {
                  const prevAngle = acc.length === 0 ? 0 : acc[acc.length - 1].endAngle;
                  const angle = (d.value / pieData.totalKcal) * 360;
                  const isLast = idx === pieData.segments.length - 1;
                  const endAngle = isLast ? 360 : prevAngle + angle;
                  const isSelected = selectedPie === d.id;
                  const path = createPieSlice(
                    prevAngle, endAngle,
                    isSelected ? 38 : 42,
                    isSelected ? 78 : 72,
                    100, 100
                  );
                  acc.push({ ...d, path, endAngle, isSelected });
                  return acc;
                }, [] as any[]).map((d: any, idx: number) => (
                  <G key={idx} onPress={() => setSelectedPie(selectedPie === d.id ? null : d.id)}>
                    <Path
                      d={d.path}
                      fill={d.color}
                      opacity={selectedPie && !d.isSelected ? 0.4 : 1}
                    />
                  </G>
                ))}
                {selectedPieData ? (
                  <>
                    <SvgText x="100" y="92" textAnchor="middle" fontSize="13" fill={COLORS.text}>
                      {selectedPieData.icon}
                    </SvgText>
                    <SvgText x="100" y="107" textAnchor="middle" fontSize="12" fontWeight="700" fill={selectedPieData.color}>
                      {selectedPieData.name}
                    </SvgText>
                    <SvgText x="100" y="123" textAnchor="middle" fontSize="18" fontWeight="800" fill={selectedPieData.color}>
                      {selectedPieData.pct.toFixed(1)}%
                    </SvgText>
                  </>
                ) : (
                  <>
                    <SvgText x="100" y="92" textAnchor="middle" fontSize="16" fontWeight="800" fill={COLORS.text}>
                      {pieData.totalKcal.toLocaleString()}
                    </SvgText>
                    <SvgText x="100" y="106" textAnchor="middle" fontSize="8" fill={COLORS.textSub}>
                      kcal（食品のみ）
                    </SvgText>
                    <SvgText x="100" y="118" textAnchor="middle" fontSize="7" fill={COLORS.textSub}>
                      目標 {sc.reqKcal.toLocaleString()} kcal
                    </SvgText>
                  </>
                )}
              </Svg>
            </View>
            {!selectedPie && (
              <Text style={{ fontSize: 9, color: COLORS.textSub, textAlign: 'center', marginTop: -4, marginBottom: 4 }}>
                タップすると内訳を表示できます
              </Text>
            )}
          </TouchableOpacity>
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
                {s.id !== 'drink' && s.id !== 'bousai' && s.id !== 'seasoning' ? (
                  <Text style={[styles.sectorPct, { color: s.color }]}>
                    {s.pct.toFixed(1)}%
                  </Text>
                ) : (s.id === 'drink' || s.id === 'bousai') ? (
                  <Text style={styles.analysisHint}>分析タブにて{'\n'}目標が確認できます</Text>
                ) : s.id === 'seasoning' ? (
                  <Text style={styles.analysisHint}>円グラフには{'\n'}表示されません</Text>
                ) : null}
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
                      const itemExpiry = item.expiry ?? '9999-12-31';
                      const isNoExpiry = itemExpiry === '9999-12-31';
                      const d = daysUntil(itemExpiry);
                      const col = isNoExpiry ? COLORS.textSub : d <= 0 ? COLORS.red : d <= 30 ? COLORS.yellow : COLORS.textSub;
                      return (
                        <View key={item.id} style={styles.itemRow}>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.itemQty}>x{item.qty}</Text>
                          <Text style={[styles.itemExpiry, { color: col }]}>
                            {isNoExpiry ? '期限なし' : d <= 0 ? '期限切れ' : d <= 30 ? `あと${d}日` : itemExpiry.replace(/-/g, '/')}
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
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 12,
    color: COLORS.textSub,
  },
  limitBanner: {
    backgroundColor: COLORS.yellow + '18',
    borderColor: COLORS.yellow + '44',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  limitText: {
    fontSize: 11,
    color: COLORS.yellow,
    fontWeight: '600',
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
  analysisHint: {
    fontSize: 8,
    color: COLORS.textSub,
    textAlign: 'right',
    lineHeight: 11,
    opacity: 0.7,
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
