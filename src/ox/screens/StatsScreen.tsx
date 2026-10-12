import React, { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Header, Row, Tap, Txt } from '../components/ui';
import { useTheme } from '../theme';
import { useDataVersion, usePremium, useToday } from '../hooks';
import { getAllRecords, getCalendar, type DayRecord } from '../db/repo';
import { getWeekStart } from '../db/settings';
import { addDays, formatDotDate, parseDateKey, weekdayLabels, type WeekStart } from '../domain/date';
import { currentStreak, heatmapWeeks, longestStreak, monthRate, rangeStats, recentMonthRates, startKeyOf, toMap, weekdayRates } from '../domain/stats';
import type { ScreenProps } from '../navigation';

const CHART_HEIGHT = 140;
const CELL = 12;
const CELL_GAP = 3;

// S06 통계: 숫자 3개, 최근 6개월 달성률, 누적 기록. 프리미엄은 1년 히트맵과 요일별 달성률을 더 본다.
export default function StatsScreen({ navigation, route }: ScreenProps<'Stats'>) {
  const { colors } = useTheme();
  const version = useDataVersion();
  const today = useToday();
  const premium = usePremium();
  const weekStart = useMemo(() => getWeekStart(), [version]);
  const calendar = useMemo(() => getCalendar(route.params.calendarId), [route.params.calendarId, version]);

  const stats = useMemo(() => {
    if (!calendar) return null;
    const records = getAllRecords(calendar.id);
    const byDate = toMap(records);
    const start = startKeyOf(calendar.createdAt, records);
    const d = parseDateKey(today);
    return {
      thisMonth: monthRate(d.getFullYear(), d.getMonth() + 1, byDate, start, today),
      streak: currentStreak(byDate, today),
      longest: longestStreak(records),
      months: recentMonthRates(6, byDate, start, today),
      totalO: records.filter((r) => r.value === 'O').length,
      totalX: records.filter((r) => r.value === 'X').length,
      firstDate: records[0]?.date ?? null,
      byDate,
      start,
      year: rangeStats(addDays(today, -364), today, byDate, start, today),
      weekdays: weekdayRates(byDate, start, today),
    };
  }, [calendar, today, version]);

  if (!calendar || !stats) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const tiles = [
    { label: '이번 달', value: `${stats.thisMonth ?? 0}%` },
    { label: '현재 연속', value: `${stats.streak}일` },
    { label: '최장 연속', value: `${stats.longest}일` },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <Header title={`${calendar.name} 통계`} onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.tiles}>
          {tiles.map((t) => (
            <View key={t.label} style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Txt weight="extrabold" style={{ fontSize: 24 }}>
                {t.value}
              </Txt>
              <Txt style={{ fontSize: 12.5, color: colors.muted }}>{t.label}</Txt>
            </View>
          ))}
        </View>

        <Card style={{ padding: 16 }}>
          <Txt style={{ fontSize: 13, color: colors.muted }}>월별 달성률</Txt>
          <View style={[styles.chart, { borderBottomColor: colors.line }]}>
            {[0.5, 1].map((f) => (
              <View key={f} style={[styles.gridLine, { bottom: CHART_HEIGHT * f, borderTopColor: colors.line }]} />
            ))}
            {stats.months.map((m, i) => {
              const isNow = i === stats.months.length - 1;
              const rate = m.rate ?? 0;
              return (
                <View key={`${m.year}-${m.month}`} style={styles.barCol}>
                  <Txt style={{ fontSize: 11, color: colors.muted, marginBottom: 4 }}>{m.rate === null ? '-' : `${rate}%`}</Txt>
                  <View style={[styles.bar, { height: Math.max(2, (CHART_HEIGHT * rate) / 100), backgroundColor: isNow ? colors.o : colors.oSoft }]} />
                </View>
              );
            })}
          </View>
          <View style={styles.xLabels}>
            {stats.months.map((m) => (
              <Txt key={`${m.year}-${m.month}`} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: colors.muted }}>
                {m.month}월
              </Txt>
            ))}
          </View>
        </Card>

        <View>
          {/* 무료 사용자에게는 흐리게 미리 보여 주고, 누르면 프리미엄 화면으로 간다. */}
          <View pointerEvents={premium ? 'auto' : 'none'} style={{ gap: 12, opacity: premium ? 1 : 0.35 }}>
            <Card style={{ padding: 16, gap: 12 }}>
              <View style={styles.cardHead}>
                <Txt style={{ fontSize: 13, color: colors.muted }}>최근 1년</Txt>
                <Txt style={{ fontSize: 13, color: colors.muted }}>
                  {premium ? `O ${stats.year.o}일 · 달성률 ${stats.year.rate ?? 0}%` : 'O --일 · 달성률 --%'}
                </Txt>
              </View>
              <Heatmap byDate={stats.byDate} start={stats.start} today={today} weekStart={weekStart} />
            </Card>
            <Card style={{ padding: 16, gap: 10 }}>
              <Txt style={{ fontSize: 13, color: colors.muted }}>요일별 달성률</Txt>
              <WeekdayBars rates={stats.weekdays} weekStart={weekStart} hidden={!premium} />
            </Card>
          </View>
          {!premium ? (
            <Tap onPress={() => navigation.navigate('Premium')} style={StyleSheet.absoluteFill}>
              <View style={styles.lockWrap}>
                <View style={[styles.lock, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  <Ionicons name="lock-closed" size={20} color={colors.ink} />
                  <Txt weight="bold" style={{ fontSize: 15 }}>
                    1년 히트맵 · 요일별 달성률
                  </Txt>
                  <Txt style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>프리미엄에서 한눈에 볼 수 있어요</Txt>
                  <View style={[styles.lockBtn, { backgroundColor: colors.ink }]}>
                    <Txt weight="semibold" style={{ color: colors.inverseText, fontSize: 13.5 }}>
                      프리미엄 보기
                    </Txt>
                  </View>
                </View>
              </View>
            </Tap>
          ) : null}
        </View>

        <Card>
          <Row title="총 O" value={`${stats.totalO}일`} />
          <Row title="총 X" value={`${stats.totalX}일`} />
          <Row title="기록 시작" value={stats.firstDate ? formatDotDate(stats.firstDate) : '아직 없음'} last />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// GitHub 잔디처럼 최근 53주를 한 칸씩. 가로로 길어서 스크롤하고, 처음엔 오늘 쪽(오른쪽 끝)을 보여 준다.
const Heatmap = ({ byDate, start, today, weekStart }: { byDate: Record<string, DayRecord>; start: string; today: string; weekStart: WeekStart }) => {
  const { colors } = useTheme();
  const scroll = useRef<ScrollView>(null);
  const weeks = useMemo(() => heatmapWeeks(weekStart, today), [weekStart, today]);
  const labels = weekdayLabels(weekStart);

  const cellColor = (key: string) => {
    if (key > today) return 'transparent';
    const v = byDate[key]?.value ?? '';
    if (v === 'O') return colors.o;
    if (v === 'X') return colors.xSoft;
    return colors.cell;
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View style={{ gap: CELL_GAP, paddingTop: 16 }}>
          {labels.map((l, i) => (
            <Txt key={l} style={{ height: CELL, lineHeight: CELL, fontSize: 9, color: colors.muted }}>
              {i % 2 === 1 ? l : ''}
            </Txt>
          ))}
        </View>
        <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
          <View style={{ flexDirection: 'row', gap: CELL_GAP }}>
            {weeks.map((week, wi) => {
              // 그 주에 1일이 있으면 위에 달 이름을 단다.
              const first = week.find((k) => k.endsWith('-01'));
              return (
                <View key={week[0]} style={{ gap: CELL_GAP }}>
                  <View style={{ height: 13, width: CELL }}>
                    {first || wi === 0 ? (
                      <Txt style={{ position: 'absolute', width: 32, fontSize: 9, color: colors.muted }}>{parseDateKey(first ?? week[0]).getMonth() + 1}월</Txt>
                    ) : null}
                  </View>
                  {week.map((key) => (
                    <View
                      key={key}
                      style={[
                        { width: CELL, height: CELL, borderRadius: 3, backgroundColor: cellColor(key), opacity: key < start ? 0.45 : 1 },
                        key === today && { borderWidth: 1.5, borderColor: colors.ink },
                      ]}
                    />
                  ))}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
      <View style={styles.legend}>
        {[
          { label: 'O', color: colors.o },
          { label: 'X', color: colors.xSoft },
          { label: '기록 없음', color: colors.cell },
        ].map((l) => (
          <View key={l.label} style={styles.legendItem}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: l.color }} />
            <Txt style={{ fontSize: 11.5, color: colors.muted }}>{l.label}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
};

const WeekdayBars = ({ rates, weekStart, hidden }: { rates: (number | null)[]; weekStart: WeekStart; hidden: boolean }) => {
  const { colors } = useTheme();
  const order = weekStart === 'sun' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0];
  const labels = weekdayLabels(weekStart);
  // 가장 잘 지킨 요일을 진하게
  const best = Math.max(...rates.map((r) => r ?? -1));
  return (
    <View style={{ gap: 8 }}>
      {order.map((dow, i) => {
        const rate = rates[dow];
        return (
          <View key={dow} style={styles.wdRow}>
            <Txt style={{ width: 16, fontSize: 13, color: dow === 0 ? colors.x : colors.muted }}>{labels[i]}</Txt>
            <View style={[styles.wdTrack, { backgroundColor: colors.cell }]}>
              <View style={{ width: `${hidden ? 50 : (rate ?? 0)}%`, height: '100%', borderRadius: 5, backgroundColor: rate !== null && rate === best && best > 0 ? colors.o : colors.oSoft }} />
            </View>
            <Txt style={{ width: 40, textAlign: 'right', fontSize: 13, color: colors.muted }}>{hidden ? '--%' : rate === null ? '-' : `${rate}%`}</Txt>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 14, paddingHorizontal: 12, gap: 2 },
  chart: { height: CHART_HEIGHT + 24, flexDirection: 'row', alignItems: 'flex-end', gap: 10, borderBottomWidth: 1, marginTop: 12 },
  gridLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  xLabels: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wdRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wdTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  lockWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lock: { alignItems: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 22 },
  lockBtn: { marginTop: 6, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16 },
});
