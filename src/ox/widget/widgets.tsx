import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { HexColor } from 'react-native-android-widget';
import { getCalendar, getRecordsInRange, listCalendars, type Calendar, type DayRecord } from '../db/repo';
import { getWeekStart, getWidgetConfig, getWidgetPage, isPremium, type WidgetTheme } from '../db/settings';
import { addDays, dateKeyOf, daysInMonth, formatShortDate, monthCells, parseDateKey, shiftMonth, todayKey, weekdayLabels, weekKeys } from '../domain/date';
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
// 앱을 열고 그 날짜의 기록 모달을 띄운다. "today"는 앱이 연 순간의 날짜로 바꾼다.
const dayUri = (calendarId: string, date: string) => `haruox://calendar/${calendarId}/${date}`;

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
      clickAction="OPEN_URI"
      // 자정 직후 위젯이 아직 어제를 보여줘도 오늘을 연다.
      clickActionData={{ uri: dayUri(calendar.id, 'today') }}
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

// 연속 기록은 오늘 기준이라 보고 있는 주/달과 상관없이 최근 기록으로 계산한다.
const streakOf = (calendarId: string, today: string) => currentStreak(getRecordsInRange(calendarId, addDays(today, -400), today), today);

const monthDay = (key: string) => {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// 주/월 위젯 제목 줄: 제목, 연속 기록, ◀ ▶.
// 제목을 누르면 이번 주/달을 보고 있을 때는 앱을 열고, 지난 주/달을 보고 있을 때는 이번으로 돌아온다.
const PagerHeader = ({ title, streak, page, calendarId, theme }: { title: string; streak: number; page: number; calendarId: string; theme: WidgetTheme }) => {
  const c = palette[theme];
  const arrow = (label: string, action: 'PREV' | 'NEXT', enabled: boolean) => (
    <FlexWidget
      clickAction={enabled ? action : undefined}
      accessibilityLabel={action === 'PREV' ? '이전' : '다음'}
      style={{ width: 26, height: 22, alignItems: 'center', justifyContent: 'center' }}
    >
      <TextWidget text={label} style={{ fontSize: 16, color: enabled ? c.ink : c.line, fontFamily: 'Pretendard-Bold' }} />
    </FlexWidget>
  );
  return (
    <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', paddingLeft: 2 }}>
      <FlexWidget
        clickAction={page === 0 ? 'OPEN_URI' : 'CURRENT'}
        clickActionData={page === 0 ? { uri: appUri(calendarId) } : undefined}
        style={{ flex: 1, width: 0, flexDirection: 'row', alignItems: 'center', flexGap: 4 }}
      >
        <TextWidget text={title} maxLines={1} truncate="END" style={{ fontSize: 12, color: c.ink, fontFamily: 'Pretendard-Bold' }} />
        <TextWidget text={`· 연속 ${streak}일`} maxLines={1} style={{ fontSize: 11, color: c.muted, fontFamily: 'Pretendard-Medium' }} />
      </FlexWidget>
      {arrow('‹', 'PREV', true)}
      {arrow('›', 'NEXT', page < 0)}
    </FlexWidget>
  );
};

export const WeekWidget = ({ calendar, theme, page }: { calendar: Calendar | null; theme: WidgetTheme; page: number }) => {
  if (!calendar) return <EmptyWidget theme={theme} />;
  const c = palette[theme];
  const today = todayKey();
  const days = weekKeys(getWeekStart(), addDays(today, page * 7));
  const records = getRecordsInRange(calendar.id, days[0], days[6]);
  const streak = streakOf(calendar.id, today);
  const when = page === 0 ? '이번 주' : page === -1 ? '지난주' : `${monthDay(days[0])}~${monthDay(days[6])}`;
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c.bg, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 8, flexGap: 6 }}>
      <PagerHeader title={`${when} · ${calendar.name}`} streak={streak} page={page} calendarId={calendar.id} theme={theme} />
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
              clickAction={future ? undefined : 'OPEN_URI'}
              clickActionData={future ? undefined : { uri: dayUri(calendar.id, key) }}
              style={{
                // 누를 수 없는 미래 날짜는 회색, 나머지는 흰색
                flex: 1, width: 0, height: 'match_parent', borderRadius: 9, backgroundColor: future ? c.cell : c.bg,
                alignItems: 'center', justifyContent: 'center',
                ...(isToday ? { borderWidth: 2, borderColor: c.ink } : {}),
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

// 미니 달력. 날짜를 누르면 앱이 그 날짜의 기록 모달로 열리고, ◀ ▶로 지난 달을 넘겨 본다.
export const MonthWidget = ({ calendar, theme, page }: { calendar: Calendar | null; theme: WidgetTheme; page: number }) => {
  if (!calendar) return <EmptyWidget theme={theme} />;
  const c = palette[theme];
  const today = todayKey();
  const d = parseDateKey(today);
  const { year, month } = shiftMonth(d.getFullYear(), d.getMonth() + 1, page);
  const weekStart = getWeekStart();
  const cells = monthCells(year, month, weekStart);
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const records = getRecordsInRange(calendar.id, dateKeyOf(year, month, 1), dateKeyOf(year, month, daysInMonth(year, month)));
  const streak = streakOf(calendar.id, today);
  const when = year === d.getFullYear() ? `${month}월` : `${year}년 ${month}월`;
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c.bg, borderRadius: 22, paddingHorizontal: 10, paddingVertical: 10, flexGap: 4 }}>
      <PagerHeader title={`${when} · ${calendar.name}`} streak={streak} page={page} calendarId={calendar.id} theme={theme} />
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', flexGap: 3 }}>
        {weekdayLabels(weekStart).map((l) => (
          <FlexWidget key={l} style={{ flex: 1, width: 0, alignItems: 'center' }}>
            <TextWidget text={l} style={{ fontSize: 9, color: l === '일' ? c.x : c.muted, fontFamily: 'Pretendard-Medium' }} />
          </FlexWidget>
        ))}
      </FlexWidget>
      {rows.map((row, ri) => (
        // 너비·높이를 0으로 두고 flex(weight)로만 나눠야 내용과 상관없이 칸 크기가 똑같다.
        <FlexWidget key={ri} style={{ width: 'match_parent', flex: 1, height: 0, flexDirection: 'row', flexGap: 3 }}>
          {row.map((key, ci) => {
            if (!key) return <FlexWidget key={`e${ri}-${ci}`} style={{ flex: 1, width: 0, height: 'match_parent' }} />;
            const value = records[key]?.value ?? '';
            const mc = markColors(value, theme);
            const future = key > today;
            // 배경: 누를 수 없는 미래 날짜는 회색, 나머지는 흰색. 날짜 글자: 평일 검정, 토요일 회색, 일요일 빨강
            const dow = parseDateKey(key).getDay();
            const dayColor = dow === 0 ? c.x : dow === 6 ? c.muted : c.ink;
            return (
              <FlexWidget
                key={key}
                clickAction={future ? undefined : 'OPEN_URI'}
                clickActionData={future ? undefined : { uri: dayUri(calendar.id, key) }}
                style={{
                  flex: 1, width: 0, height: 'match_parent', borderRadius: 6, backgroundColor: future ? c.cell : c.bg, padding: 2,
                  ...(key === today ? { borderWidth: 1.5, borderColor: c.ink } : {}),
                }}
              >
                <FlexWidget style={{ width: 'match_parent', alignItems: 'flex-end' }}>
                  <TextWidget text={`${parseDateKey(key).getDate()}일`} style={{ fontSize: 7, color: dayColor, fontFamily: 'Pretendard-Medium' }} />
                </FlexWidget>
                <FlexWidget style={{ width: 'match_parent', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  {value !== '' ? (
                    <TextWidget text={markSymbol(value, calendar.markStyle)} style={{ fontSize: 18, color: mc.fg, fontFamily: 'Pretendard-ExtraBold' }} />
                  ) : null}
                </FlexWidget>
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
  if (widgetName === 'WeekOX') return <WeekWidget calendar={calendar} theme={theme} page={getWidgetPage(widgetId)} />;
  if (widgetName === 'MonthOX') return <MonthWidget calendar={calendar} theme={theme} page={getWidgetPage(widgetId)} />;
  return <TodayWidget calendar={calendar} theme={theme} />;
};
