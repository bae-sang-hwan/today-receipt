import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Header, Row, Txt } from '../components/ui';
import { useTheme } from '../theme';
import { useDataVersion, useToday } from '../hooks';
import { getAllRecords, getCalendar } from '../db/repo';
import { formatDotDate, parseDateKey } from '../domain/date';
import { currentStreak, longestStreak, monthRate, recentMonthRates, startKeyOf, toMap } from '../domain/stats';
import type { ScreenProps } from '../navigation';

const CHART_HEIGHT = 140;

// S06 통계: 숫자 3개, 최근 6개월 달성률, 누적 기록
export default function StatsScreen({ navigation, route }: ScreenProps<'Stats'>) {
  const { colors } = useTheme();
  const version = useDataVersion();
  const today = useToday();
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

        <Card>
          <Row title="총 O" value={`${stats.totalO}일`} />
          <Row title="총 X" value={`${stats.totalX}일`} />
          <Row title="기록 시작" value={stats.firstDate ? formatDotDate(stats.firstDate) : '아직 없음'} last />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 14, paddingHorizontal: 12, gap: 2 },
  chart: { height: CHART_HEIGHT + 24, flexDirection: 'row', alignItems: 'flex-end', gap: 10, borderBottomWidth: 1, marginTop: 12 },
  gridLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  xLabels: { flexDirection: 'row', gap: 10, marginTop: 6 },
});
