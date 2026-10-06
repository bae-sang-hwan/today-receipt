import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Header, Row, Tap, Txt } from '../components/ui';
import { BannerSlot } from '../components/BannerSlot';
import { useTheme } from '../theme';
import { useDataVersion, usePremium, useToday } from '../hooks';
import { getRecordsInRange, listCalendars, reorderCalendars, getAllRecords } from '../db/repo';
import { addDays, dateKeyOf, daysInMonth, parseDateKey } from '../domain/date';
import { currentStreak, monthRate, startKeyOf, toMap } from '../domain/stats';
import { FREE_CALENDAR_LIMIT } from '../config';
import type { ScreenProps } from '../navigation';

// S04 캘린더 관리
export default function CalendarManageScreen({ navigation }: ScreenProps<'CalendarManage'>) {
  const { colors } = useTheme();
  const version = useDataVersion();
  const today = useToday();
  const premium = usePremium();
  const calendars = useMemo(() => listCalendars(), [version]);

  const summaries = useMemo(() => {
    const d = parseDateKey(today);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return Object.fromEntries(
      calendars.map((c) => {
        const all = getAllRecords(c.id);
        const month = getRecordsInRange(c.id, dateKeyOf(y, m, 1), dateKeyOf(y, m, daysInMonth(y, m)));
        const rate = monthRate(y, m, month, startKeyOf(c.createdAt, all), today);
        const streak = currentStreak(getRecordsInRange(c.id, addDays(today, -400), today), today);
        return [c.id, `이번 달 ${rate ?? 0}% · 연속 ${streak}일`];
      }),
    );
  }, [calendars, today]);

  const move = (index: number, delta: number) => {
    const ids = calendars.map((c) => c.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderCalendars(ids);
  };

  const add = () => {
    if (!premium && calendars.length >= FREE_CALENDAR_LIMIT) navigation.navigate('Premium');
    else navigation.navigate('CalendarEdit', {});
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <Header title="캘린더 관리" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          {calendars.map((c, i) => (
            <Row
              key={c.id}
              title={c.name}
              sub={summaries[c.id]}
              last={i === calendars.length - 1}
              onPress={() => navigation.navigate('CalendarEdit', { id: c.id })}
              chevron={false}
              left={<View style={[styles.dot, { backgroundColor: c.color }]} />}
              right={
                <View style={styles.order}>
                  <Tap onPress={() => move(i, -1)} disabled={i === 0} hitSlop={6} accessibilityLabel={`${c.name} 위로`} style={{ opacity: i === 0 ? 0.25 : 1 }}>
                    <Ionicons name="chevron-up" size={20} color={colors.muted} />
                  </Tap>
                  <Tap
                    onPress={() => move(i, 1)}
                    disabled={i === calendars.length - 1}
                    hitSlop={6}
                    accessibilityLabel={`${c.name} 아래로`}
                    style={{ opacity: i === calendars.length - 1 ? 0.25 : 1 }}
                  >
                    <Ionicons name="chevron-down" size={20} color={colors.muted} />
                  </Tap>
                </View>
              }
            />
          ))}
        </Card>

        <Tap onPress={add} style={[styles.add, { borderColor: colors.line }]}>
          <Ionicons name="add" size={20} color={colors.muted} />
          <Txt weight="medium" style={{ color: colors.muted }}>
            캘린더 추가
          </Txt>
        </Tap>

        {!premium ? (
          <Tap onPress={() => navigation.navigate('Premium')} style={[styles.note, { borderColor: colors.line }]}>
            <Txt style={{ color: colors.muted, fontSize: 13.5 }}>
              무료로 {FREE_CALENDAR_LIMIT}개까지 만들 수 있어요. <Txt weight="bold" style={{ fontSize: 13.5 }}>프리미엄</Txt>은 무제한.
            </Txt>
          </Tap>
        ) : null}
      </ScrollView>
      <BannerSlot />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  order: { flexDirection: 'row', gap: 10 },
  add: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 15 },
  note: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 14 },
});
