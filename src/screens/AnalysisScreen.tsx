import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  Linking,
  LayoutChangeEvent,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { Bar } from '../components/Bar';
import { ScoreGauge } from '../components/ScoreGauge';
import { calcScore } from '../utils/scoring';
import { daysUntil } from '../utils/date';
import { JP_AVG } from '../constants/jpAvg';
import { SECTORS } from '../constants/sectors';
import { GOV } from '../constants/ageKcal';
import { StockItem, Member, ScoreResult } from '../types';
import {
  FALLBACK_ITEMS,
  buildRakutenSearchUrl,
  isRakutenConfigured,
  getRecommendations,
  type RakutenItem,
} from '../services/rakuten';

interface AnalysisScreenProps {
  items: StockItem[];
  members: Member[];
  regionDays: number;
}

export const AnalysisScreen = ({
  items,
  members,
  regionDays,
}: AnalysisScreenProps) => {
  const sc = useMemo(() => calcScore(items, members, regionDays), [items, members, regionDays]);
  const [scoreDetail, setScoreDetail] = useState<string | null>(null);

  // ── 充足度の詳細パネル ──
  const SufDetail = () => {
    const kcalPct = (sc.kcalR * 100).toFixed(1);
    const waterPct = (sc.waterR * 100).toFixed(1);
    const kcalShort = Math.max(0, sc.reqKcal - sc.totalKcal);
    const waterShort = Math.max(0, sc.reqWater - sc.totalWaterL);
    return (
      <View style={[styles.detailCard, { borderColor: COLORS.blue + '44' }]}>
        <View style={styles.detailHeader}>
          <Text style={[styles.detailTitle, { color: COLORS.blue }]}>
            📦 充足度の詳細
          </Text>
          <TouchableOpacity onPress={() => setScoreDetail(null)} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕ 閉じる</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.detailDesc}>
          {sc.familySize}人 × {sc.govDays}日分に対して、今どのくらい足りているかを示します。
        </Text>
        <Text style={[styles.detailBigNum, { color: COLORS.blue }]}>
          {((sc.suf / 40) * 100).toFixed(1)}
          <Text style={styles.detailBigUnit}>%</Text>
        </Text>

        {/* カロリー */}
        <View style={styles.metricBlock}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>カロリー（配点の60%）</Text>
            <Text style={styles.metricSub}>
              {sc.totalKcal.toLocaleString()} / {sc.reqKcal.toLocaleString()} kcal
            </Text>
          </View>
          <Bar pct={sc.kcalR * 100} color={COLORS.blue} h={8} />
          <Text style={[styles.metricPct, { color: COLORS.blue }]}>{kcalPct}%</Text>
        </View>

        {/* 水 */}
        <View style={styles.metricBlock}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>水（配点の40%）</Text>
            <Text style={styles.metricSub}>
              {sc.totalWaterL.toFixed(1)} / {sc.reqWater} L
            </Text>
          </View>
          <Bar pct={sc.waterR * 100} color={COLORS.blue} h={8} />
          <Text style={[styles.metricPct, { color: COLORS.blue }]}>{waterPct}%</Text>
        </View>

        {/* アドバイス */}
        <View style={[styles.adviceBox, { backgroundColor: COLORS.blue + '11' }]}>
          <Text style={[styles.adviceTitle, { color: COLORS.blue }]}>💡 スコアを上げるには</Text>
          {kcalShort > 0 && (
            <Text style={styles.adviceText}>
              🍚 あと約{Math.ceil(kcalShort / 380)}食分（アルファ米換算）追加するとカロリーが100%に
            </Text>
          )}
          {waterShort > 0 && (
            <Text style={styles.adviceText}>
              💧 保存水2Lを{Math.ceil(waterShort / 2)}本追加すると水が100%に
            </Text>
          )}
          {sc.kcalR >= 1 && sc.waterR >= 1 && (
            <Text style={styles.adviceText}>🎉 充足度は満点です！この調子で維持しましょう</Text>
          )}
        </View>
      </View>
    );
  };

  // ── バランスの詳細パネル ──
  const BalDetail = () => {
    const secData = SECTORS.map((s) => {
      const k = items.filter((i) => i.sec === s.id).reduce((a, i) => a + (i.qty ?? 0) * (i.kcal ?? 0), 0);
      const ratio = sc.totalKcal > 0 ? k / sc.totalKcal : 0;
      return { ...s, ratio, diff: ratio - s.targetRatio };
    });
    const worst = [...secData].sort((a, b) => a.diff - b.diff)[0];
    const over = [...secData].sort((a, b) => b.diff - a.diff)[0];
    return (
      <View style={[styles.detailCard, { borderColor: COLORS.accent + '44' }]}>
        <View style={styles.detailHeader}>
          <Text style={[styles.detailTitle, { color: COLORS.accent }]}>
            ⚖️ バランスの詳細
          </Text>
          <TouchableOpacity onPress={() => setScoreDetail(null)} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕ 閉じる</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.detailDesc}>
          農水省の5分類をベースに、各セクターが目標配分にどのくらい近いかを評価します。
        </Text>
        <Text style={[styles.detailBigNum, { color: COLORS.accent }]}>
          {((sc.bal / 40) * 100).toFixed(1)}
          <Text style={styles.detailBigUnit}>%</Text>
        </Text>
        <Text style={styles.dampNote}>
          ※ 充足度に応じて補正されます（備蓄が少ない時はスコアが抑制されます）
        </Text>

        {/* セクター別グラフ */}
        {secData.map((s, i) => (
          <View key={i} style={styles.sectorBar}>
            <View style={styles.sectorBarHeader}>
              <Text style={styles.metricLabel}>{s.icon} {s.name}</Text>
              <Text style={styles.metricSub}>
                現在 {(s.ratio * 100).toFixed(1)}% / 目標 {(s.targetRatio * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: COLORS.bg, overflow: 'hidden' }}>
              <View
                style={{
                  position: 'absolute',
                  left: `${Math.min(98, (s.targetRatio / 0.35) * 100)}%`,
                  top: -1,
                  width: 2,
                  height: 8,
                  backgroundColor: COLORS.textSub,
                  borderRadius: 1,
                  zIndex: 2,
                }}
              />
              <View
                style={{
                  width: `${Math.min(100, (s.ratio / 0.35) * 100)}%`,
                  height: '100%',
                  backgroundColor: s.color,
                  borderRadius: 3,
                  opacity: s.ratio >= s.targetRatio ? 1 : 0.7,
                }}
              />
            </View>
          </View>
        ))}

        <View style={[styles.adviceBox, { backgroundColor: COLORS.accent + '11', marginTop: 8 }]}>
          <Text style={[styles.adviceTitle, { color: COLORS.accent }]}>💡 スコアを上げるには</Text>
          {worst.diff < -0.05 && (
            <Text style={styles.adviceText}>
              {worst.icon} 「{worst.name}」が目標より{Math.abs(worst.diff * 100).toFixed(0)}%不足。数品追加するとバランスが改善します
            </Text>
          )}
          {over.diff > 0.1 && (
            <Text style={styles.adviceText}>
              {over.icon} 「{over.name}」が目標より{(over.diff * 100).toFixed(0)}%多め。他セクターを補強すると均等に近づきます
            </Text>
          )}
          {sc.bal >= 35 && (
            <Text style={styles.adviceText}>🎉 バランスは良好です！偏りなく備蓄できています</Text>
          )}
        </View>
      </View>
    );
  };

  // ── 安定度の詳細パネル ──
  const RiskDetail = () => {
    const expiring = items.filter((i) => {
      const d = daysUntil(i.expiry ?? '9999-12-31');
      return d > 0 && d <= 30;
    });
    const expPct = items.length > 0 ? Math.round((expiring.length / items.length) * 100) : 0;
    const maxSec = SECTORS.reduce<{ icon: string; name: string; r: number; id: string; targetRatio: number; color: string }>(
      (best, s) => {
        const k = items.filter((i) => i.sec === s.id).reduce((a, i) => a + (i.qty ?? 0) * (i.kcal ?? 0), 0);
        const r = sc.totalKcal > 0 ? k / sc.totalKcal : 0;
        return r > best.r ? { icon: s.icon, name: s.name, r, id: s.id, targetRatio: s.targetRatio, color: s.color } : best;
      },
      { icon: '', name: '', r: 0, id: '', targetRatio: 0, color: '' }
    );
    const expScore = Math.round((sc.riskExp / 12) * 100);
    const secScore = Math.round((sc.riskSec / 8) * 100);
    return (
      <View style={[styles.detailCard, { borderColor: COLORS.purple + '44' }]}>
        <View style={styles.detailHeader}>
          <Text style={[styles.detailTitle, { color: COLORS.purple }]}>
            🛡️ 安定度の詳細
          </Text>
          <TouchableOpacity onPress={() => setScoreDetail(null)} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕ 閉じる</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.detailDesc}>
          備蓄が「いざという時にちゃんと使えるか」を2つの観点で評価します。
        </Text>
        <Text style={[styles.detailBigNum, { color: COLORS.purple }]}>
          {((sc.risk / 20) * 100).toFixed(1)}
          <Text style={styles.detailBigUnit}>%</Text>
        </Text>
        <Text style={styles.dampNote}>
          ※ 充足度に応じて補正されます（備蓄が少ない時はスコアが抑制されます）
        </Text>

        {/* 期限の余裕 */}
        <View style={styles.metricBlock}>
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { fontWeight: '600' }]}>
              ① 期限の余裕（配点の60%）
            </Text>
            <Text style={[styles.metricPctInline, { color: COLORS.purple }]}>{expScore}%</Text>
          </View>
          <Bar pct={expScore} color={COLORS.purple} h={6} />
          <Text style={styles.riskSubText}>
            30日以内に期限切れ：
            <Text style={{ fontWeight: '600', color: COLORS.text }}>
              {expiring.length}品 / {items.length}品（{expPct}%）
            </Text>
          </Text>
          <Text style={styles.riskComment}>
            {expPct === 0
              ? '全品目に余裕があります'
              : expPct <= 15
              ? '少数が期限間近ですが概ね良好'
              : expPct <= 33
              ? '期限間近の品目がやや多め'
              : '期限間近の品目が多く、入替が必要です'}
          </Text>
        </View>

        {/* セクター偏り */}
        <View style={styles.metricBlock}>
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { fontWeight: '600' }]}>
              ② 品目の偏りのなさ（配点の40%）
            </Text>
            <Text style={[styles.metricPctInline, { color: COLORS.purple }]}>{secScore}%</Text>
          </View>
          <Bar pct={secScore} color={COLORS.purple} h={6} />
          <Text style={styles.riskSubText}>
            最も比率が高いセクター：
            <Text style={{ fontWeight: '600', color: COLORS.text }}>
              {maxSec.icon} {maxSec.name}（{(maxSec.r * 100).toFixed(0)}%）
            </Text>
          </Text>
          <Text style={styles.riskComment}>
            {maxSec.r <= 0.35
              ? 'バランスよく分散されています'
              : maxSec.r <= 0.5
              ? 'まずまずの分散度です'
              : maxSec.r <= 0.75
              ? '1セクターに偏り気味です'
              : '特定セクターに集中しています'}
          </Text>
        </View>

        <View style={[styles.adviceBox, { backgroundColor: COLORS.purple + '11' }]}>
          <Text style={[styles.adviceTitle, { color: COLORS.purple }]}>💡 安定度を上げるには</Text>
          {expiring.length > 0 && (
            <>
              <Text style={styles.adviceText}>
                📋 期限が近い{expiring.length}品を食べて入れ替えましょう（ローリングストック）
              </Text>
              <Text style={styles.adviceSubText}>
                {expiring
                  .slice(0, 3)
                  .map((i) => `${i.name}（あと${daysUntil(i.expiry ?? '9999-12-31')}日）`)
                  .join('、')}
              </Text>
            </>
          )}
          {maxSec.r > 0.5 && (
            <Text style={[styles.adviceText, { marginTop: 4 }]}>
              {maxSec.icon} 「{maxSec.name}」以外のセクターを追加すると偏りが改善します
            </Text>
          )}
          {sc.risk >= 18 && (
            <Text style={styles.adviceText}>
              🎉 安定度は良好！期限もバランスよく管理できています
            </Text>
          )}
        </View>
      </View>
    );
  };

  // ── 政府推奨基準との比較 ──
  const GovComparison = () => {
    const denom = sc.familySize * regionDays;
    const perPersonDay = {
      kcal: denom > 0 ? sc.totalKcal / denom : 0,
      water: denom > 0 ? sc.totalWaterL / denom : 0,
    };
    const toiletQty = items
      .filter((i) => i.name.includes('トイレ'))
      .reduce((s, i) => s + i.qty, 0);
    const toiletTarget = sc.familySize * regionDays;
    const toiletR = toiletTarget > 0 ? Math.min(1, toiletQty / toiletTarget) : 1;
    const gasQty = items
      .filter((i) => i.name.includes('ボンベ') || i.name.includes('カセット'))
      .reduce((s, i) => s + i.qty, 0);
    const gasTarget = Math.ceil(regionDays / 3);
    const gasR = gasTarget > 0 ? Math.min(1, gasQty / gasTarget) : 1;

    const govRows = [
      {
        label: 'カロリー',
        cur: `${Math.round(perPersonDay.kcal).toLocaleString()} kcal/人日`,
        std: `${GOV.KCAL_PER_DAY.toLocaleString()} kcal/人日`,
        pct: perPersonDay.kcal / GOV.KCAL_PER_DAY,
        src: '農水省',
      },
      {
        label: '飲料水',
        cur: `${perPersonDay.water.toFixed(1)} L/人日`,
        std: `${GOV.WATER_L_PER_DAY} L/人日`,
        pct: perPersonDay.water / GOV.WATER_L_PER_DAY,
        src: '内閣府',
      },
      {
        label: '簡易トイレ',
        cur: `${toiletQty} セット`,
        std: `${toiletTarget} 回分`,
        pct: toiletR,
        src: '内閣府',
      },
      {
        label: 'カセットボンベ',
        cur: `${gasQty} 本`,
        std: `${gasTarget} 本`,
        pct: gasR,
        src: '経産省',
      },
    ];

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>🏛️ 政府推奨基準との比較</Text>
        <Text style={styles.cardSubtitle}>
          1人1日あたりの基準値と比較（{sc.familySize}人 × {regionDays}日分）
        </Text>
        {govRows.map((r, i) => {
          const barColor = r.pct >= 0.8 ? COLORS.green : r.pct >= 0.5 ? COLORS.yellow : COLORS.orange;
          return (
            <View key={i} style={styles.govRow}>
              <View style={styles.govRowHeader}>
                <Text style={styles.metricLabel}>{r.label}</Text>
                <Text style={styles.metricSub}>
                  {r.cur} / 基準 {r.std} ({r.src})
                </Text>
              </View>
              <Bar pct={r.pct * 100} color={barColor} h={8} />
              <Text style={[styles.metricPct, { color: barColor }]}>
                {(r.pct * 100).toFixed(0)}% 達成
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  // ── 全国との比較（インライン描画） ──
  const [barWidth, setBarWidth] = useState(0);
  const onBarLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setBarWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
  }, []);

  const ncZ1 = 0.35;
  const ncZ2 = 0.42;
  const ncZ3 = 0.23;
  const ncZones = useMemo(() => [
    { w: ncZ1, pct: 40,   label: '0〜3日分', col: '#FF8A65' },
    { w: ncZ2, pct: 52.7, label: '3〜7日分', col: COLORS.yellow },
    { w: ncZ3, pct: 7.3,  label: '7日分〜',  col: COLORS.green },
  ], []);
  const ncUserZone = sc.userDays < 3 ? 0 : sc.userDays < 7 ? 1 : 2;

  // 日数 → バー内のピクセル位置
  const ncDayToPx = useCallback((days: number): number => {
    const d = Number.isFinite(days) && days > 0 ? days : 0;
    const W = barWidth || 1;
    if (d === 0) return 2;
    if (d <= 3) return (d / 3) * ncZ1 * W;
    if (d <= 7) return (ncZ1 + ((d - 3) / 4) * ncZ2) * W;
    const z3Pos = Math.min(ncZ3 - 0.02, ((d - 7) / 21) * ncZ3);
    return (ncZ1 + ncZ2 + z3Pos) * W;
  }, [barWidth]);

  const ncClamp = useCallback((v: number) => Math.max(2, Math.min((barWidth || 100) - 2, v)), [barWidth]);
  const ncUserPx = ncClamp(ncDayToPx(sc.userDays));
  const ncAvgPx = ncClamp(ncDayToPx(JP_AVG.avgDays));
  const ncGovPx = ncClamp((ncZ1 + ncZ2) * (barWidth || 1));
  const ncRegionPx = ncClamp(ncDayToPx(regionDays));

  // ── 不足セクター算出 ──
  const weakSectors = useMemo(() => {
    return SECTORS
      .map((s) => {
        const sKcal = items
          .filter((i) => i.sec === s.id)
          .reduce((a, i) => a + (i.qty ?? 0) * (i.kcal ?? 0), 0);
        const ratio = sc.totalKcal > 0 ? sKcal / sc.totalKcal : 0;
        return { id: s.id, diff: ratio - s.targetRatio };
      })
      .filter((s) => s.diff < -0.02)
      .sort((a, b) => a.diff - b.diff)
      .map((s) => s.id);
  }, [items, sc]);

  // ── 楽天API商品（API設定時） ──
  const [rakutenItems, setRakutenItems] = useState<RakutenItem[]>([]);
  useEffect(() => {
    if (isRakutenConfigured() && weakSectors.length > 0) {
      getRecommendations(weakSectors)
        .then((r) => setRakutenItems(r))
        .catch(() => {});
    }
  }, [weakSectors]);

  // ── おすすめ商品（フォールバック or API） ──
  const recommendedFallbacks = useMemo(() => {
    const matched = FALLBACK_ITEMS.filter((f) => weakSectors.includes(f.sectorId));
    if (matched.length >= 3) return matched.slice(0, 4);
    const rest = FALLBACK_ITEMS.filter((f) => !weakSectors.includes(f.sectorId));
    return [...matched, ...rest].slice(0, 4);
  }, [weakSectors]);

  const hasApi = isRakutenConfigured() && rakutenItems.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* スコア内訳カード */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>🛡️ 備蓄スコアの内訳</Text>
        <View style={styles.scoreRow}>
          <ScoreGauge
            score={sc.suf}
            label="充足度"
            max={40}
            color={COLORS.blue}
            sub={`kcal${(sc.kcalR * 100).toFixed(0)}% 水${(sc.waterR * 100).toFixed(0)}%`}
            onClick={() => setScoreDetail(scoreDetail === 'suf' ? null : 'suf')}
          />
          <ScoreGauge
            score={sc.bal}
            label="バランス"
            max={40}
            color={COLORS.accent}
            sub="農水省5分類基準"
            onClick={() => setScoreDetail(scoreDetail === 'bal' ? null : 'bal')}
          />
          <ScoreGauge
            score={sc.risk}
            label="安定度"
            max={20}
            color={COLORS.purple}
            sub="期限・偏り評価"
            onClick={() => setScoreDetail(scoreDetail === 'risk' ? null : 'risk')}
          />
        </View>
      </View>

      {/* スコア詳細パネル */}
      {scoreDetail === 'suf' && <SufDetail />}
      {scoreDetail === 'bal' && <BalDetail />}
      {scoreDetail === 'risk' && <RiskDetail />}

      {/* 政府推奨基準との比較 */}
      <GovComparison />

      {/* ── 全国との比較（インライン） ── */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>🇯🇵 全国との比較</Text>
        <Text style={styles.cardSubtitle}>
          出典：内閣府防災世論調査（2025）、農中総研調査（2024）
        </Text>
        {/* 上ラベル行1: 平均 */}
        <View style={{ position: 'relative', height: 12, marginBottom: 1 }} onLayout={onBarLayout}>
          {barWidth > 0 && (
            <Text style={{ position: 'absolute', left: Math.max(0, ncAvgPx - 18), fontSize: 8, color: COLORS.yellow, fontWeight: '600' }}>
              平均{JP_AVG.avgDays}日
            </Text>
          )}
        </View>
        {/* 上ラベル行2: 内閣府推奨 */}
        <View style={{ position: 'relative', height: 12, marginBottom: 1 }}>
          {barWidth > 0 && (
            <Text style={{ position: 'absolute', left: Math.max(0, Math.min(ncGovPx - 24, (barWidth || 300) - 60)), fontSize: 8, color: COLORS.blue, fontWeight: '600' }}>
              内閣府推奨7日
            </Text>
          )}
        </View>
        {/* バー本体 */}
        <View style={{ position: 'relative' }}>
          <View style={{ flexDirection: 'row', borderRadius: 10, overflow: 'hidden', height: 44 }}>
            {ncZones.map((z, i) => {
              const isUser = i === ncUserZone;
              return (
                <View
                  key={i}
                  style={{
                    flex: z.w,
                    backgroundColor: z.col + (isUser ? '30' : '12'),
                    borderRightWidth: i < 2 ? 1 : 0,
                    borderRightColor: COLORS.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: z.col }}>{z.pct}%</Text>
                  <Text style={{ fontSize: 8, color: COLORS.textSub }}>{z.label}</Text>
                </View>
              );
            })}
          </View>
          {barWidth > 0 && (
            <>
              {/* 平均の縦線 — バーを突き抜けて上下ラベルまで伸ばす */}
              <View style={{ position: 'absolute', left: ncAvgPx - 1, top: -14, bottom: 0, width: 2, backgroundColor: COLORS.yellow + '88', zIndex: 3 }} />
              {/* 内閣府推奨の縦線 */}
              <View style={{ position: 'absolute', left: ncGovPx - 1, top: -1, bottom: 0, width: 2, backgroundColor: COLORS.blue + '88', zIndex: 3 }} />
              {/* 地域推奨の縦線 */}
              {regionDays > 7 && (
                <View style={{ position: 'absolute', left: ncRegionPx - 1, top: 0, bottom: -14, width: 2, backgroundColor: COLORS.green + '88', zIndex: 4 }} />
              )}
              {/* あなたのマーカー */}
              <View style={{ position: 'absolute', left: ncUserPx - 1.5, top: 0, bottom: -14, width: 3, borderRadius: 1.5, backgroundColor: '#E8709A', zIndex: 5 }} />
            </>
          )}
        </View>
        {/* 下ラベル行1: あなた */}
        <View style={{ position: 'relative', height: 14, marginTop: 1 }}>
          {barWidth > 0 && (
            <Text style={{ position: 'absolute', left: ncUserPx - 36, top: 0, fontSize: 9, fontWeight: '700', color: '#E8709A', width: 72, textAlign: 'center' }}>
              あなた{sc.userDays.toFixed(1)}日
            </Text>
          )}
        </View>
        {/* 下ラベル行2: 地域推奨 */}
        {regionDays > 7 && (
          <View style={{ position: 'relative', height: 14 }}>
            {barWidth > 0 && (
              <Text style={{ position: 'absolute', left: Math.max(0, Math.min(ncRegionPx - 22, (barWidth || 300) - 70)), top: 0, fontSize: 9, fontWeight: '600', color: COLORS.green }}>
                地域推奨{regionDays}日
              </Text>
            )}
          </View>
        )}
        <View style={[styles.zoneIndicator, { backgroundColor: ncZones[ncUserZone].col + '11', borderColor: ncZones[ncUserZone].col + '33' }]}>
          <Text style={{ fontSize: 10, color: ncZones[ncUserZone].col, fontWeight: '700' }}>
            あなたは「{ncZones[ncUserZone].label}」のエリアにいます
          </Text>
        </View>
      </View>

      {/* ── おすすめ商品（インライン） ── */}
      <View style={[styles.sectionCard, { borderColor: COLORS.orange + '33', backgroundColor: COLORS.orange + '08' }]}>
        <Text style={[styles.cardTitle, { color: COLORS.orange }]}>🛒 おすすめ商品</Text>
        <Text style={styles.cardSubtitle}>
          {weakSectors.length > 0 ? 'スコアの低いセクターに合わせて厳選' : '備蓄の定番アイテム'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {hasApi
            ? rakutenItems.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.partnerCard}
                  onPress={() => Linking.openURL(item.affiliateUrl)}
                >
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="contain" />
                  ) : (
                    <View style={[styles.productImage, styles.productImagePlaceholder]}>
                      <Text style={{ fontSize: 20 }}>📦</Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.text }} numberOfLines={2}>
                    {item.itemName}
                  </Text>
                  <Text style={{ fontSize: 9, color: COLORS.textSub }}>{item.shopName}</Text>
                  {item.reviewCount > 0 && (
                    <Text style={{ fontSize: 8, color: COLORS.yellow }}>
                      ★{item.reviewAverage.toFixed(1)} ({item.reviewCount})
                    </Text>
                  )}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.accent, marginTop: 3 }}>
                    ¥{item.itemPrice.toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 7, color: COLORS.textSub, marginTop: 2 }}>楽天市場で見る →</Text>
                </TouchableOpacity>
              ))
            : recommendedFallbacks.map((p, i) => {
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.partnerCard}
                    onPress={() => Linking.openURL(buildRakutenSearchUrl(p.searchQuery))}
                  >
                    {p.imageUrl ? (
                      <Image source={{ uri: p.imageUrl }} style={styles.productImage} resizeMode="contain" />
                    ) : (
                      <View style={[styles.productImage, styles.productImagePlaceholder]}>
                        <Text style={{ fontSize: 20 }}>{p.icon}</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.text }} numberOfLines={2}>
                      {p.name}
                    </Text>
                    <Text style={{ fontSize: 9, color: COLORS.textSub }}>{p.brand}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.accent, marginTop: 3 }}>
                      {p.price}〜
                    </Text>
                    <Text style={{ fontSize: 7, color: COLORS.textSub, marginTop: 2 }}>楽天市場で探す →</Text>
                  </TouchableOpacity>
                );
              })
          }
        </ScrollView>
        <Text style={{ fontSize: 7, color: COLORS.textSub, marginTop: 6, textAlign: 'center', opacity: 0.6 }}>
          ※ 楽天市場の商品ページに移動します
        </Text>
      </View>
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
    paddingVertical: 16,
    paddingBottom: 32,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 9,
    color: COLORS.textSub,
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },

  // ── 詳細パネル ──
  detailCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  closeBtnText: {
    fontSize: 10,
    color: COLORS.textSub,
  },
  detailDesc: {
    fontSize: 11,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 16,
  },
  detailBigNum: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  detailBigUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSub,
  },
  dampNote: {
    fontSize: 9,
    color: COLORS.textSub,
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.8,
  },

  // ── メトリック ──
  metricBlock: {
    marginBottom: 10,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.text,
  },
  metricSub: {
    fontSize: 10,
    color: COLORS.textSub,
  },
  metricPct: {
    textAlign: 'right',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  metricPctInline: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectorBar: {
    marginBottom: 8,
  },
  sectorBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },

  // ── アドバイス ──
  adviceBox: {
    borderRadius: 8,
    padding: 10,
  },
  adviceTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  adviceText: {
    fontSize: 11,
    color: COLORS.text,
    lineHeight: 18,
  },
  adviceSubText: {
    fontSize: 10,
    color: COLORS.textSub,
    marginLeft: 20,
    marginTop: 2,
  },

  // ── リスク ──
  riskSubText: {
    fontSize: 10,
    color: COLORS.textSub,
    marginTop: 3,
    lineHeight: 16,
  },
  riskComment: {
    fontSize: 9,
    color: COLORS.textSub,
    marginTop: 1,
  },

  // ── 政府基準 ──
  govRow: {
    marginBottom: 10,
  },
  govRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },

  // ── 全国比較 ──
  zoneIndicator: {
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  comparisonItem: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 10,
    color: COLORS.textSub,
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    color: COLORS.textSub,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  // ── パートナー ──
  partnerCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    minWidth: 120,
    maxWidth: 140,
    alignItems: 'center',
    marginRight: 8,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 6,
    marginBottom: 6,
    backgroundColor: COLORS.bg,
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
