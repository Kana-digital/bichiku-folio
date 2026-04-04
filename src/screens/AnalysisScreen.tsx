import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { Bar } from '../components/Bar';
import { ScoreGauge } from '../components/ScoreGauge';
import { calcScore } from '../utils/scoring';
import { JP_AVG } from '../constants/jpAvg';
import { SECTORS } from '../constants/sectors';
import { GOV } from '../constants/ageKcal';
import { StockItem, Member, ScoreResult } from '../types';

interface AnalysisScreenProps {
  items: StockItem[];
  members: Member[];
  regionDays: number;
}

const daysUntil = (d: string) => {
  const t = new Date(d).getTime();
  if (isNaN(t)) return 0;
  return Math.ceil((t - Date.now()) / 86400000);
};

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
      const k = items.filter((i) => i.sec === s.id).reduce((a, i) => a + i.qty * i.kcal, 0);
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
      const d = daysUntil(i.expiry);
      return d > 0 && d <= 30;
    });
    const expPct = items.length > 0 ? Math.round((expiring.length / items.length) * 100) : 0;
    const maxSec = SECTORS.reduce<{ icon: string; name: string; r: number; id: string; targetRatio: number; color: string }>(
      (best, s) => {
        const k = items.filter((i) => i.sec === s.id).reduce((a, i) => a + i.qty * i.kcal, 0);
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
                  .map((i) => `${i.name}（あと${daysUntil(i.expiry)}日）`)
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
    const perPersonDay = {
      kcal: sc.totalKcal / (sc.familySize * regionDays),
      water: sc.totalWaterL / (sc.familySize * regionDays),
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

  // ── 全国との比較 ──
  const NationalComparison = () => {
    const zones = [
      { w: 40, label: '0〜3日分', col: '#FF8A65', dayRange: [0, 3] as const },
      { w: 52.7, label: '3〜7日分', col: COLORS.yellow, dayRange: [3, 7] as const },
      { w: 7.3, label: '7日分〜', col: COLORS.green, dayRange: [7, 999] as const },
    ];
    const userZone = sc.userDays < 3 ? 0 : sc.userDays < 7 ? 1 : 2;

    // バー全体に対する左位置(%)を日数から算出（7日超は21日をMaxとして7.3%ゾーンに配分）
    const dayToLeft = (days: number) => {
      if (days <= 0) return 1;
      if (days <= 3) return (days / 3) * 40;
      if (days <= 7) return 40 + ((days - 3) / 4) * 52.7;
      return Math.min(99, 92.7 + ((days - 7) / 14) * 7.3);
    };
    const userLeft = dayToLeft(sc.userDays);
    const avgLeft = dayToLeft(JP_AVG.avgDays);  // 5.3日 → ~70%
    const govLeft = 92.7;  // 7日: ゾーン境界
    const regionLeft = dayToLeft(regionDays);  // 地域推奨位置

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>🇯🇵 全国との比較</Text>
        <Text style={styles.cardSubtitle}>
          出典：内閣府防災世論調査（2025）、農中総研調査（2024）
        </Text>

        {/* バー本体（重ねレイヤー） */}
        <View style={{ position: 'relative' }}>
          {/* ゾーンバー */}
          <View style={{ flexDirection: 'row', borderRadius: 10, overflow: 'hidden', height: 44 }}>
            {zones.map((z, i) => {
              const isUser = i === userZone;
              return (
                <View
                  key={i}
                  style={{
                    width: `${z.w}%`,
                    backgroundColor: z.col + (isUser ? '30' : '12'),
                    borderRightWidth: i < 2 ? 1 : 0,
                    borderRightColor: COLORS.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: z.col }}>{z.w}%</Text>
                  <Text style={{ fontSize: 8, color: COLORS.textSub }}>{z.label}</Text>
                </View>
              );
            })}
          </View>
          {/* 全国平均ライン + ラベル */}
          <View style={{ position: 'absolute', left: `${avgLeft}%`, top: -14, bottom: -14, alignItems: 'center', zIndex: 3 }}>
            <Text style={{ fontSize: 8, color: COLORS.yellow, fontWeight: '600', marginBottom: 1 }}>
              平均{JP_AVG.avgDays}日
            </Text>
            <View style={{ width: 2, flex: 1, backgroundColor: COLORS.yellow + '88' }} />
            <Text style={{ fontSize: 7, color: COLORS.yellow, marginTop: 1 }}>▲</Text>
          </View>
          {/* 内閣府推奨7日ライン + ラベル（7.3%ゾーンの左端） */}
          <View style={{ position: 'absolute', left: `${govLeft}%`, top: -14, bottom: -14, alignItems: 'flex-start', zIndex: 3 }}>
            <Text style={{ fontSize: 8, color: COLORS.blue, fontWeight: '600', marginBottom: 1, marginLeft: -2 }}>
              内閣府推奨7日
            </Text>
            <View style={{ width: 2, flex: 1, backgroundColor: COLORS.blue + '88' }} />
            <Text style={{ fontSize: 7, color: COLORS.blue, marginTop: 1 }}>▲</Text>
          </View>
          {/* 地域推奨ライン（7日超の場合のみ別線で表示） */}
          {regionDays > 7 && (
            <View style={{ position: 'absolute', left: `${regionLeft}%`, top: 0, bottom: -14, alignItems: 'center', zIndex: 4 }}>
              <View style={{ width: 2, flex: 1, backgroundColor: COLORS.green + '88' }} />
              <Text style={{ fontSize: 7, color: COLORS.green, marginTop: 1 }}>▲</Text>
            </View>
          )}
          {/* あなたマーカー */}
          <View style={{ position: 'absolute', left: `${userLeft}%`, top: 0, bottom: 0, width: 3, backgroundColor: COLORS.accent, zIndex: 5 }} />
        </View>

        {/* バー下ラベル */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.accent }}>
            ▲ あなた {sc.userDays.toFixed(1)}日分
          </Text>
          <Text style={{ fontSize: 9, fontWeight: '600', color: COLORS.green }}>
            地域推奨 {regionDays}日
          </Text>
        </View>

        {/* 補足テキスト */}
        <View style={[styles.zoneIndicator, { backgroundColor: zones[userZone].col + '11', borderColor: zones[userZone].col + '33' }]}>
          <Text style={{ fontSize: 10, color: zones[userZone].col, fontWeight: '700' }}>
            あなたは「{zones[userZone].label}」のエリアにいます
          </Text>
        </View>
      </View>
    );
  };

  // ── パートナー提携 ──
  const Partners = () => {
    const products = [
      { name: '防災セットPRO', brand: 'BOUSAI Co.', price: '¥12,800', img: '🎒' },
      { name: '10年保存水 2L×6', brand: 'AquaSafe', price: '¥2,480', img: '💧' },
      { name: 'ソーラー充電ラジオ', brand: 'EmgTech', price: '¥4,980', img: '📻' },
    ];
    return (
      <View style={[styles.sectionCard, { borderColor: COLORS.purple + '33', backgroundColor: COLORS.purple + '11' }]}>
        <Text style={[styles.cardTitle, { color: COLORS.purple }]}>🤝 パートナー提携</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {products.map((p, i) => (
            <View key={i} style={styles.partnerCard}>
              <Text style={{ fontSize: 28, marginBottom: 4 }}>{p.img}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.text }}>{p.name}</Text>
              <Text style={{ fontSize: 9, color: COLORS.textSub }}>{p.brand}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.accent, marginTop: 3 }}>
                {p.price}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

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

      {/* 全国との比較 */}
      <NationalComparison />

      {/* パートナー提携 */}
      <Partners />
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
    alignItems: 'center',
    marginRight: 8,
  },
});
