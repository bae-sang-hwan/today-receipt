import type { DayRecord } from '../db/repo';
import { addDays, daysInMonth, dateKeyOf, parseDateKey, shiftMonth, toDateKey, todayKey, weekKeys, type WeekStart } from './date';

export interface MonthRate {
  year: number;
  month: number;
  rate: number | null; // 0~100, 셀 날이 없으면 null
}

// 기록 시작일: 캘린더를 만든 날과 첫 기록 중 이른 날
export const startKeyOf = (createdAt: number, records: DayRecord[]) => {
  const created = toDateKey(new Date(createdAt));
  const first = records.find((r) => r.value !== '')?.date;
  return first && first < created ? first : created;
};

// 달성률 = O 일수 ÷ 지난 날 수. 어제까지 세고, 오늘은 기록했을 때만 넣는다. 기록 시작 전 날짜는 뺀다.
export const monthRate = (
  year: number,
  month: number,
  byDate: Record<string, DayRecord>,
  startKey: string,
  today = todayKey(),
): number | null => {
  let elapsed = 0;
  let o = 0;
  for (let day = 1; day <= daysInMonth(year, month); day++) {
    const key = dateKeyOf(year, month, day);
    if (key < startKey || key > today) continue;
    const v = byDate[key]?.value ?? '';
    if (key === today && v === '') continue;
    elapsed++;
    if (v === 'O') o++;
  }
  return elapsed === 0 ? null : Math.round((o / elapsed) * 100);
};

// 오늘부터 거꾸로 O가 이어진 날 수. 오늘이 빈칸이면 어제부터 센다.
export const currentStreak = (byDate: Record<string, DayRecord>, today = todayKey()) => {
  let key = (byDate[today]?.value ?? '') === '' ? addDays(today, -1) : today;
  let count = 0;
  while (byDate[key]?.value === 'O') {
    count++;
    key = addDays(key, -1);
  }
  return count;
};

export const longestStreak = (records: DayRecord[]) => {
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const r of records) {
    if (r.value !== 'O') {
      run = 0;
      prev = r.date;
      continue;
    }
    run = prev !== null && addDays(prev, 1) === r.date && run > 0 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = r.date;
  }
  return best;
};

export const recentMonthRates = (
  count: number,
  byDate: Record<string, DayRecord>,
  startKey: string,
  today = todayKey(),
): MonthRate[] => {
  const [y, m] = today.split('-').map(Number);
  const startMonth = startKey.slice(0, 7);
  const result: MonthRate[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const { year, month } = shiftMonth(y, m, -i);
    if (`${year}-${String(month).padStart(2, '0')}` < startMonth) continue;
    result.push({ year, month, rate: monthRate(year, month, byDate, startKey, today) });
  }
  return result;
};

// 기간 달성률. monthRate와 같은 규칙(기록 시작 전·미래는 빼고, 오늘은 기록했을 때만 센다).
export const rangeStats = (from: string, to: string, byDate: Record<string, DayRecord>, startKey: string, today = todayKey()) => {
  let elapsed = 0;
  let o = 0;
  const end = to < today ? to : today;
  for (let key = from < startKey ? startKey : from; key <= end; key = addDays(key, 1)) {
    const v = byDate[key]?.value ?? '';
    if (key === today && v === '') continue;
    elapsed++;
    if (v === 'O') o++;
  }
  return { o, elapsed, rate: elapsed === 0 ? null : Math.round((o / elapsed) * 100) };
};

// 요일별 달성률. index는 Date.getDay()(0=일요일).
export const weekdayRates = (byDate: Record<string, DayRecord>, startKey: string, today = todayKey()) => {
  const elapsed = Array(7).fill(0);
  const o = Array(7).fill(0);
  for (let key = startKey; key <= today; key = addDays(key, 1)) {
    const v = byDate[key]?.value ?? '';
    if (key === today && v === '') continue;
    const dow = parseDateKey(key).getDay();
    elapsed[dow]++;
    if (v === 'O') o[dow]++;
  }
  return elapsed.map((n, i) => (n === 0 ? null : Math.round((o[i] / n) * 100)));
};

// 1년 히트맵: 오늘이 든 주까지 최근 53주. 한 열이 한 주(위→아래 = 한 주의 시작 요일부터).
export const heatmapWeeks = (weekStart: WeekStart, today = todayKey(), weeks = 53) =>
  Array.from({ length: weeks }, (_, i) => weekKeys(weekStart, addDays(today, -7 * (weeks - 1 - i))));

export const toMap = (records: DayRecord[]) => {
  const map: Record<string, DayRecord> = {};
  records.forEach((r) => {
    map[r.date] = r;
  });
  return map;
};
