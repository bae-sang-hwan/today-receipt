import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { HexColor } from 'react-native-android-widget';
import { getCalendar, getRecordsInRange, listCalendars, type Calendar, type DayRecord } from '../db/repo';
import { getWeekStart, getWidgetConfig, isPremium, type WidgetTheme } from '../db/settings';
import { addDays, formatShortDate, monthCells, parseDateKey, todayKey, weekdayLabels, weekKeys } from '../domain/date';
import { currentStreak } from '../domain/stats';
import { markSymbol } from '../domain/mark';

export const WIDGET_NAMES = ['TodayOX', 'WeekOX', 'MonthOX'] as const;
export type WidgetName = (typeof WIDGET_NAMES)[number];

const palette = {
  light: {
    bg: '#FFFFFF' as HexColor, ink: '#16202B' as HexColor, muted: '#5F6B7A' as HexColor, line: '#E2E6EC' as HexColor,
    cell: '#EEF0F4' as HexColor, o: '#2457D6' as HexColor, oSoft: '#E3EBFC' as HexColor, x: '#D23F36' as HexColor, xSoft: '#FBE6E4' as HexColor,
  },
  dark: {
    bg: '#181E25' as HexColor, ink: '#E7EBF0' as HexColor, muted: '#98A3B0' as HexColor, line: '#29313B' as HexColor,
    cell: '#1F262F' as HexColor, o: '#7AA2FF' as HexColor, oSoft: '#1D2C4D' as HexColor, x: '#FF7A70' as HexColor, xSoft: '#46201E' as HexColor,
  },
};

const appUri = (calendarId?: string) => (calendarId ? `haruox://calendar/${calendarId}` : 'haruox://');

// 위젯에 연결된 캘린더. 설정이 없거나 지워졌으면 첫 번째 캘린더를 쓴다.
export const resolveWidget = (widgetId: number): { calendar: Calendar | null; theme: WidgetTheme } => {
  const config = getWidgetConfig(widgetId);
  const calendar = (config && getCalendar(config.calendarId)) || listCalendars()[0] || null;
  // 어두운 테마는 프리미엄 기능이다.
  const theme: WidgetTheme = config?.theme === 'dark' && isPremium() ? 'dark' : 'light';
  return { calendar, theme };
};

const EmptyWidget = ({ theme }: { theme: WidgetTheme }) => {
  const c = palette[theme];
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c.bg, borderRadius: 22, alignItems: 'center', justifyContent: 'center', padding: 8 }}
    >
      <TextWidget text="앱에서 캘린더를 만들어 주세요" style={{ fontSize: 11, color: c.muted, fontFamily: 'Pretendard-Medium', textAlign: 'center' }} />
    </FlexWidget>
  );
};

const markColors = (value: DayRecord['value'], theme: WidgetTheme) => {
  const c = palette[theme];
  if (value === 'O') return { bg: c.oSoft, fg: c.o };
  if (value === 'X') return { bg: c.xSoft, fg: c.x };
  return { bg: c.cell, fg: c.muted };
};

export const TodayWidget = ({ calendar, theme }: { calendar: Calendar | null; theme: WidgetTheme }) => {
  if (!calendar) return <EmptyWidget theme={theme} />;
  const c = palette[theme];
  const today = todayKey();
  const value = getRecordsInRange(calendar.id, today, today)[today]?.value ?? '';
  const mc = markColors(value, theme);
  return (
    <FlexWidget
      clickAction="TOGGLE"
      clickActionData={{ today: true }}
      accessibilityLabel={`${calendar.name} 오늘 기록`}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c.bg, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexGap: 3 }}
    >
      <TextWidget text={calendar.name} maxLines={1} truncate="END" style={{ fontSize: 11, color: c.muted, fontFamily: 'Pretendard-Medium' }} />
      <FlexWidget
        style={{
          width: 44, height: 44, borderRadius: 12, backgroundColor: mc.bg, alignItems: 'center', justifyContent: 'center',
          ...(value === '' ? { borderWidth: 1.5, borderColor: c.line, borderStyle: 'dashed' as const } : {}),
        }}
      >
        <TextWidget text={value === '' ? '탭' : markSymbol(value, calendar.markStyle)} style={{ fontSize: value === '' ? 11 : 26, color: mc.fg, fontFamily: value === '' ? 'Pretendard-Medium' : 'Pretendard-ExtraBold' }} />
      </FlexWidget>
      <TextWidget text={formatShortDate(today)} style={{ fontSize: 10, color: c.muted, fontFamily: 'Pretendard-Medium' }} />
    </FlexWidget>
  );
};

export const WeekWidget = ({ calendar, theme }: { calendar: Calendar | null; theme: WidgetTheme }) => {
  if (!calendar) return <EmptyWidget theme={theme} />;
  const c = palette[theme];
  const today = todayKey();
  const days = weekKeys(getWeekStart(), today);
  // 연속 기록 계산을 위해 넉넉히 1년 전부터 읽는다.
  const yearAgo = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`;
  const records = getRecordsInRange(calendar.id, yearAgo, today);
  const streak = currentStreak(records, today);
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c.bg, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 8, flexGap: 6 }}>
      <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: appUri(calendar.id) }} style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text={`${calendar.name} · 이번 주`} maxLines={1} truncate="END" style={{ fontSize: 11, color: c.muted, fontFamily: 'Pretendard-Medium' }} />
        <TextWidget text={`연속 ${streak}일`} style={{ fontSize: 11, color: c.ink, fontFamily: 'Pretendard-Bold' }} />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'row', flexGap: 4 }}>
        {days.map((key) => {
          const value = records[key]?.value ?? '';
          const mc = markColors(value, theme);
          const future = key > today;
          const isToday = key === today;
          const dow = parseDateKey(key).getDay();
          return (
            <FlexWidget
              key={key}
              clickAction={future ? undefined : 'TOGGLE'}
              clickActionData={future ? undefined : { date: key }}
              style={{
                flex: 1, height: 'match_parent', borderRadius: 9, backgroundColor: future ? c.bg : mc.bg,
                alignItems: 'center', justifyContent: 'center',
                ...(isToday ? { borderWidth: 2, borderColor: c.ink } : future ? { borderWidth: 1, borderColor: c.line } : {}),
              }}
            >
              <TextWidget
                text={formatShortDate(key)}
                maxLines={1}
                // 칸이 좁은 기기에서는 "10/14 화"가 한 줄에 들어가도록 글자를 줄인다.
                style={{ fontSize: 9, color: dow === 0 ? c.x : c.muted, fontFamily: 'Pretendard-Medium', adjustsFontSizeToFit: true }}
              />
              {value !== '' ? (
                <TextWidget text={markSymbol(value, calendar.markStyle)} style={{ fontSize: 17, color: mc.fg, fontFamily: 'Pretendard-ExtraBold' }} />
              ) : null}
            </FlexWidget>
          );
        })}
      </FlexWidget>
    </FlexWidget>
  );
};

// 이번 달 미니 달력. 오늘과 지난 날을 바로 눌러 기록하고, 위쪽 제목을 누르면 앱이 열린다.
export const MonthWidget = ({ calendar, theme }: { calendar: Calendar | null; theme: WidgetTheme }) => {
  if (!calendar) return <EmptyWidget theme={theme} />;
  const c = palette[theme];
  const today = todayKey();
  const d = parseDateKey(today);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const weekStart = getWeekStart();
  const cells = monthCells(year, month, weekStart);
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const records = getRecordsInRange(calendar.id, addDays(today, -400), today);
  const streak = currentStreak(records, today);
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c.bg, borderRadius: 22, paddingHorizontal: 10, paddingVertical: 10, flexGap: 4 }}>
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: appUri(calendar.id) }}
        style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2, paddingBottom: 2 }}
      >
        <TextWidget text={`${calendar.name} · ${month}월`} maxLines={1} truncate="END" style={{ fontSize: 12, color: c.ink, fontFamily: 'Pretendard-Bold' }} />
        <TextWidget text={`연속 ${streak}일`} style={{ fontSize: 11, color: c.muted, fontFamily: 'Pretendard-Medium' }} />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', flexGap: 3 }}>
        {weekdayLabels(weekStart).map((l) => (
          <FlexWidget key={l} style={{ flex: 1, alignItems: 'center' }}>
            <TextWidget text={l} style={{ fontSize: 9, color: l === '일' ? c.x : c.muted, fontFamily: 'Pretendard-Medium' }} />
          </FlexWidget>
        ))}
      </FlexWidget>
      {rows.map((row, ri) => (
        <FlexWidget key={ri} style={{ width: 'match_parent', flex: 1, flexDirection: 'row', flexGap: 3 }}>
          {row.map((key, ci) => {
            if (!key) return <FlexWidget key={`e${ri}-${ci}`} style={{ flex: 1, height: 'match_parent' }} />;
            const value = records[key]?.value ?? '';
            const mc = markColors(value, theme);
            const future = key > today;
            return (
              <FlexWidget
                key={key}
                clickAction={future ? undefined : 'TOGGLE'}
                clickActionData={future ? undefined : { date: key }}
                style={{
                  flex: 1, height: 'match_parent', borderRadius: 6, backgroundColor: future ? c.bg : mc.bg,
                  alignItems: 'center', justifyContent: 'center',
                  ...(key === today ? { borderWidth: 1.5, borderColor: c.ink } : {}),
                }}
              >
                {value !== '' ? (
                  <TextWidget text={markSymbol(value, calendar.markStyle)} style={{ fontSize: 13, color: mc.fg, fontFamily: 'Pretendard-ExtraBold' }} />
                ) : (
                  <TextWidget text={String(parseDateKey(key).getDate())} style={{ fontSize: 9, color: future ? c.line : c.muted, fontFamily: 'Pretendard-Medium' }} />
                )}
              </FlexWidget>
            );
          })}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
};

export const renderWidgetFor = (widgetName: string, widgetId: number) => {
  const { calendar, theme } = resolveWidget(widgetId);
  if (widgetName === 'WeekOX') return <WeekWidget calendar={calendar} theme={theme} />;
  if (widgetName === 'MonthOX') return <MonthWidget calendar={calendar} theme={theme} />;
  return <TodayWidget calendar={calendar} theme={theme} />;
};
