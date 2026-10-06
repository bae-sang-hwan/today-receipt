import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Tap, Txt, Mark } from '../components/ui';
import { BannerSlot } from '../components/BannerSlot';
import { DaySheet } from '../components/DaySheet';
import { useTheme, fonts } from '../theme';
import { useDataVersion, useToday } from '../hooks';
import { haptic } from '../haptics';
import { cycleRecord, getRecordsInRange, getSetting, listCalendars, setSetting, type Calendar } from '../db/repo';
import { getLastCalendarId, getWeekStart, setLastCalendarId } from '../db/settings';
import { addDays, dateKeyOf, daysInMonth, monthCells, parseDateKey, shiftMonth, weekdayLabels } from '../domain/date';
import { currentStreak } from '../domain/stats';
import type { ScreenProps } from '../navigation';

const H_PAD = 16;
const GAP = 5;

export default function MainScreen({ navigation, route }: ScreenProps<'Main'>) {
  const { colors } = useTheme();
  const version = useDataVersion();
  const today = useToday();
  const { width } = useWindowDimensions();

  const calendars = useMemo(() => listCalendars(), [version]);
  const [selectedId, setSelectedId] = useState<string | null>(() => route.params?.calendarId ?? getLastCalendarId());
  const calendar: Calendar | undefined = calendars.find((c) => c.id === selectedId) ?? calendars[0];

  const [ym, setYm] = useState(() => {
    const d = parseDateKey(today);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const [hintShown, setHintShown] = useState(() => getSetting('hint_tap') === '1');

  // 알림이나 위젯에서 특정 캘린더로 들어온 경우
  useEffect(() => {
    const id = route.params?.calendarId;
    if (!id) return;
    setSelectedId(id);
    const d = parseDateKey(today);
    setYm({ year: d.getFullYear(), month: d.getMonth() + 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.calendarId]);

  useEffect(() => {
    if (calendar && calendar.id !== getLastCalendarId()) setLastCalendarId(calendar.id);
  }, [calendar?.id]);

  // 캘린더를 모두 지우면 첫 실행 화면으로
  useEffect(() => {
    if (calendars.length === 0) navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
  }, [calendars.length, navigation]);

  const weekStart = useMemo(() => getWeekStart(), [version]);
  const cells = useMemo(() => monthCells(ym.year, ym.month, weekStart), [ym, weekStart]);

  const records = useMemo(() => {
    if (!calendar) return {};
    return getRecordsInRange(calendar.id, dateKeyOf(ym.year, ym.month, 1), dateKeyOf(ym.year, ym.month, daysInMonth(ym.year, ym.month)));
  }, [calendar?.id, ym, version]);

  const streak = useMemo(() => {
    if (!calendar) return 0;
    return currentStreak(getRecordsInRange(calendar.id, addDays(today, -400), today), today);
  }, [calendar?.id, today, version]);

  if (!calendar) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const cellSize = (width - H_PAD * 2 - GAP * 6) / 7;
  const isCurrentMonth = today.startsWith(`${ym.year}-${String(ym.month).padStart(2, '0')}`);

  const changeMonth = (delta: number) => setYm((cur) => shiftMonth(cur.year, cur.month, delta));
  const goToday = () => {
    const d = parseDateKey(today);
    setYm({ year: d.getFullYear(), month: d.getMonth() + 1 });
  };
  const switchCalendar = (delta: number) => {
    const i = calendars.findIndex((c) => c.id === calendar.id);
    const next = calendars[i + delta];
    if (!next) return;
    haptic.tap();
    setSelectedId(next.id);
  };

  const onTapDay = (key: string) => {
    if (key > today) return;
    cycleRecord(calendar.id, key);
    if (!hintShown) {
      setSetting('hint_tap', '1');
      setHintShown(true);
    }
  };

  // 좌우로 밀면 캘린더 전환, 위아래로 밀면 월 이동
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-30, 30])
    .activeOffsetY([-30, 30])
    .onEnd((e) => {
      if (Math.abs(e.translationX) > Math.abs(e.translationY)) {
        if (Math.abs(e.translationX) > 50) switchCalendar(e.translationX < 0 ? 1 : -1);
      } else if (Math.abs(e.translationY) > 50) {
        haptic.tap();
        changeMonth(e.translationY < 0 ? 1 : -1);
      }
    });

  const labels = weekdayLabels(weekStart);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <View style={styles.topbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flex: 1 }}>
          {calendars.map((c) => {
            const on = c.id === calendar.id;
            return (
              <Tap
                key={c.id}
                onPress={() => setSelectedId(c.id)}
                style={[styles.chip, { backgroundColor: on ? colors.ink : colors.cell }]}
                accessibilityLabel={`${c.name} 캘린더`}
              >
                <View style={[styles.chipDot, { backgroundColor: c.color }]} />
                <Txt weight={on ? 'bold' : 'medium'} style={{ fontSize: 14, color: on ? colors.inverseText : colors.muted }}>
                  {c.name}
                </Txt>
              </Tap>
            );
          })}
          <Tap onPress={() => navigation.navigate('CalendarManage')} style={[styles.chip, { backgroundColor: colors.cell }]} accessibilityLabel="캘린더 관리">
            <Ionicons name="add" size={18} color={colors.muted} />
          </Tap>
        </ScrollView>
        <View style={styles.icons}>
          <Tap onPress={() => navigation.navigate('Stats', { calendarId: calendar.id })} hitSlop={8} accessibilityLabel="통계">
            <Ionicons name="bar-chart-outline" size={22} color={colors.muted} />
          </Tap>
          <Tap onPress={() => navigation.navigate('Settings')} hitSlop={8} accessibilityLabel="설정">
            <Ionicons name="settings-outline" size={22} color={colors.muted} />
          </Tap>
        </View>
      </View>

      <GestureDetector gesture={swipe}>
        <View style={{ flex: 1, paddingHorizontal: H_PAD }}>
          <View style={styles.monthNav}>
            <Tap onPress={() => changeMonth(-1)} hitSlop={12} accessibilityLabel="이전 달">
              <Ionicons name="chevron-back" size={22} color={colors.muted} />
            </Tap>
            <Tap onPress={goToday} accessibilityLabel="오늘이 있는 달로">
              <Txt weight="extrabold" style={{ fontSize: 20 }}>
                {ym.year}년 {ym.month}월
              </Txt>
            </Tap>
            <Tap onPress={() => changeMonth(1)} hitSlop={12} accessibilityLabel="다음 달">
              <Ionicons name="chevron-forward" size={22} color={colors.muted} />
            </Tap>
          </View>

          <View style={[styles.row, { gap: GAP, marginBottom: 6 }]}>
            {labels.map((l) => (
              <Txt key={l} weight="medium" style={{ width: cellSize, textAlign: 'center', fontSize: 12, color: l === '일' ? colors.x : colors.muted }}>
                {l}
              </Txt>
            ))}
          </View>

          <View style={[styles.grid, { gap: GAP }]}>
            {cells.map((key, i) => {
              if (!key) return <View key={`e${i}`} style={{ width: cellSize, height: cellSize * 1.12 }} />;
              const rec = records[key];
              const value = rec?.value ?? '';
              const future = key > today;
              const isToday = key === today;
              return (
                <Tap
                  key={key}
                  disabled={future}
                  hapticStyle="mark"
                  pressedOpacity={0.75}
                  onPress={() => onTapDay(key)}
                  onLongPress={() => setSheetDate(key)}
                  delayLongPress={350}
                  accessibilityLabel={`${parseDateKey(key).getDate()}일 ${value === 'O' ? 'O' : value === 'X' ? 'X' : '기록 없음'}`}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize * 1.12,
                      backgroundColor: value === 'O' ? colors.oSoft : value === 'X' ? colors.xSoft : colors.cell,
                      opacity: future ? 0.4 : 1,
                    },
                    isToday && { borderWidth: 2, borderColor: colors.ink },
                  ]}
                >
                  <Txt style={[styles.dayNum, { color: colors.muted }]}>{parseDateKey(key).getDate()}</Txt>
                  {rec?.memo ? <View style={[styles.memoDot, { backgroundColor: colors.muted }]} /> : null}
                  <View style={{ marginTop: 8 }}>
                    <Mark value={value} markStyle={calendar.markStyle} size={Math.min(26, cellSize * 0.5)} />
                  </View>
                </Tap>
              );
            })}
          </View>

          {!hintShown && isCurrentMonth ? (
            <Txt style={{ textAlign: 'center', color: colors.muted, fontSize: 13, marginTop: 14 }}>
              날짜를 누르면 O, 한 번 더 누르면 X. 길게 누르면 메모를 남길 수 있어요.
            </Txt>
          ) : null}

          <Tap
            onPress={() => navigation.navigate('Stats', { calendarId: calendar.id })}
            style={[styles.streak, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <Txt style={{ color: colors.muted, fontSize: 14 }}>연속 기록</Txt>
            <Txt style={{ fontSize: 14 }}>
              <Txt weight="extrabold" style={{ fontSize: 18, fontFamily: fonts.extrabold }}>
                {streak}
              </Txt>
              일째
            </Txt>
          </Tap>
        </View>
      </GestureDetector>

      <BannerSlot />

      <DaySheet calendar={calendar} date={sheetDate} onClose={() => setSheetDate(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', paddingLeft: H_PAD, paddingRight: H_PAD, paddingTop: 8, gap: 10 },
  chips: { gap: 6, paddingRight: 8, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  icons: { flexDirection: 'row', gap: 16 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  row: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dayNum: { position: 'absolute', top: 4, left: 6, fontSize: 11 },
  memoDot: { position: 'absolute', top: 6, right: 6, width: 5, height: 5, borderRadius: 3 },
  streak: {
    marginTop: 'auto', marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
  },
});
