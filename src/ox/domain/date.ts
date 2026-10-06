// 기록은 기기의 현지 날짜("YYYY-MM-DD") 문자열로 저장한다. 시간대를 바꿔도 이미 기록한 날짜는 옮기지 않는다.

export type WeekStart = 'sun' | 'mon';

const pad = (n: number) => String(n).padStart(2, '0');

export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayKey = () => toDateKey(new Date());

export const parseDateKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (key: string, days: number) => {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
};

export const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

// month는 1~12
export const monthKey = (year: number, month: number) => `${year}-${pad(month)}`;

export const dateKeyOf = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;

export const shiftMonth = (year: number, month: number, delta: number) => {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const weekdayLabels = (weekStart: WeekStart) =>
  weekStart === 'sun' ? WEEKDAYS : [...WEEKDAYS.slice(1), WEEKDAYS[0]];

export const weekdayOf = (key: string) => WEEKDAYS[parseDateKey(key).getDay()];

// 달력 칸 배열. 앞쪽 빈칸은 null.
export const monthCells = (year: number, month: number, weekStart: WeekStart): (string | null)[] => {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const offset = weekStart === 'sun' ? firstDay : (firstDay + 6) % 7;
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let day = 1; day <= daysInMonth(year, month); day++) cells.push(dateKeyOf(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

// 오늘이 포함된 주의 7일
export const weekKeys = (weekStart: WeekStart, today = todayKey()) => {
  const day = parseDateKey(today).getDay();
  const back = weekStart === 'sun' ? day : (day + 6) % 7;
  const start = addDays(today, -back);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const formatLongDate = (key: string) => {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
};

export const formatShortDate = (key: string) => {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1}/${d.getDate()} ${WEEKDAYS[d.getDay()]}`;
};

export const formatDotDate = (key: string) => {
  const d = parseDateKey(key);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
};

export const formatReminder = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h < 12 ? '오전' : '오후';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${pad(m)}`;
};
