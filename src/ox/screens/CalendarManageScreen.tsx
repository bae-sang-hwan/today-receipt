import React, { useMemo } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Header, Row, Tap, Txt } from '../components/ui';
import { BannerSlot } from '../components/BannerSlot';
import { useDragReorder } from '../components/reorder';
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
  const saved = useMemo(() => listCalendars(), [version]);

  const summaries = useMemo(() => {
    const d = parseDateKey(today);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return Object.fromEntries(
      saved.map((c) => {
        const all = getAllRecords(c.id);
        const month = getRecordsInRange(c.id, dateKeyOf(y, m, 1), dateKeyOf(y, m, daysInMonth(y, m)));
        const rate = monthRate(y, m, month, startKeyOf(c.createdAt, all), today);
        const streak = currentStreak(getRecordsInRange(c.id, addDays(today, -400), today), today);
        return [c.id, `이번 달 ${rate ?? 0}% · 연속 ${streak}일`];
      }),
    );
  }, [saved, today]);

  // 꾹 눌러서 끌어 순서 바꾸기
  const { list: calendars, bind, move } = useDragReorder({ items: saved, axis: 'y', onReorder: reorderCalendars });

  const add = () => {
    if (!premium && calendars.length >= FREE_CALENDAR_LIMIT) navigation.navigate('Premium');
    else navigation.navigate('CalendarEdit', {});
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <Header title="캘린더 관리" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          {calendars.map((c, i) => {
            const drag = bind(i);
            return (
              <GestureDetector key={c.id} gesture={drag.gesture}>
                <Animated.View
                  onLayout={drag.onLayout}
                  accessibilityActions={[
                    { name: 'moveUp', label: '위로 이동' },
                    { name: 'moveDown', label: '아래로 이동' },
                  ]}
                  onAccessibilityAction={(e) => move(i, e.nativeEvent.actionName === 'moveUp' ? -1 : 1)}
                  style={[{ transform: drag.transform }, drag.dragging && [styles.dragging, { backgroundColor: colors.surface }]]}
                >
                  <Row
                    title={c.name}
                    sub={summaries[c.id]}
                    last={i === calendars.length - 1}
                    onPress={() => navigation.navigate('CalendarEdit', { id: c.id })}
                    chevron={false}
                    left={<View style={[styles.dot, { backgroundColor: c.color }]} />}
                    right={<Ionicons name="reorder-three" size={22} color={colors.muted} />}
                  />
                </Animated.View>
              </GestureDetector>
            );
          })}
        </Card>
        {calendars.length > 1 ? (
          <Txt style={{ color: colors.muted, fontSize: 12.5, textAlign: 'center' }}>꾹 눌러서 끌면 순서를 바꿀 수 있어요.</Txt>
        ) : null}

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
  dragging: { zIndex: 1, elevation: 6, opacity: 0.95 },
  add: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 15 },
  note: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 14 },
});
