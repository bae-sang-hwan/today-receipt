import { getDb } from './database';
import { DEFAULT_REMINDER } from '../config';
import { todayKey } from '../domain/date';

export type MarkValue = 'O' | 'X' | '';
export type MarkStyle = 'ox' | 'check';

export interface Calendar {
  id: string;
  name: string;
  color: string;
  markStyle: MarkStyle;
  order: number;
  reminder: string | null; // "21:00" 또는 null(꺼짐)
  createdAt: number;
  updatedAt: number;
}

export interface DayRecord {
  calendarId: string;
  date: string;
  value: MarkValue;
  memo: string;
  updatedAt: number;
}

interface CalendarRow {
  id: string;
  name: string;
  color: string;
  mark_style: string;
  sort_order: number;
  reminder: string | null;
  created_at: number;
  updated_at: number;
  deleted: number;
  dirty: number;
}

interface RecordRow {
  calendar_id: string;
  date: string;
  value: string;
  memo: string;
  updated_at: number;
  dirty: number;
}

const toCalendar = (r: CalendarRow): Calendar => ({
  id: r.id,
  name: r.name,
  color: r.color,
  markStyle: r.mark_style === 'check' ? 'check' : 'ox',
  order: r.sort_order,
  reminder: r.reminder,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toRecord = (r: RecordRow): DayRecord => ({
  calendarId: r.calendar_id,
  date: r.date,
  value: (r.value === 'O' || r.value === 'X' ? r.value : '') as MarkValue,
  memo: r.memo,
  updatedAt: r.updated_at,
});

// ---- 변경 알림: 화면과 위젯 갱신, 동기화, 알림 재예약이 여기에 붙는다 ----

export type ChangeKind = 'calendar' | 'record' | 'setting';
type Listener = (kind: ChangeKind) => void;
const listeners = new Set<Listener>();

export const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitChange = (kind: ChangeKind) => {
  listeners.forEach((l) => l(kind));
};

// 같은 밀리초에 두 번 고쳐도 순서가 유지되도록 항상 증가하는 시각을 쓴다.
let lastStamp = 0;
export const now = () => {
  const t = Date.now();
  lastStamp = t > lastStamp ? t : lastStamp + 1;
  return lastStamp;
};

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

// ---- 캘린더 ----

export const listCalendars = (): Calendar[] =>
  getDb()
    .getAllSync<CalendarRow>('SELECT * FROM calendars WHERE deleted = 0 ORDER BY sort_order, created_at')
    .map(toCalendar);

export const getCalendar = (id: string): Calendar | null => {
  const row = getDb().getFirstSync<CalendarRow>('SELECT * FROM calendars WHERE id = ? AND deleted = 0', [id]);
  return row ? toCalendar(row) : null;
};

export const createCalendar = (input: { name: string; color: string; markStyle?: MarkStyle; reminder?: string | null }) => {
  const db = getDb();
  const max = db.getFirstSync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM calendars WHERE deleted = 0');
  const t = now();
  const cal: Calendar = {
    id: newId(),
    name: input.name,
    color: input.color,
    markStyle: input.markStyle ?? 'ox',
    order: (max?.m ?? -1) + 1,
    reminder: input.reminder === undefined ? DEFAULT_REMINDER : input.reminder,
    createdAt: t,
    updatedAt: t,
  };
  db.runSync(
    'INSERT INTO calendars (id, name, color, mark_style, sort_order, reminder, created_at, updated_at, deleted, dirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1)',
    [cal.id, cal.name, cal.color, cal.markStyle, cal.order, cal.reminder, cal.createdAt, cal.updatedAt],
  );
  emitChange('calendar');
  return cal;
};

export const updateCalendar = (id: string, patch: Partial<Pick<Calendar, 'name' | 'color' | 'markStyle' | 'reminder'>>) => {
  const cur = getCalendar(id);
  if (!cur) return;
  const next = { ...cur, ...patch };
  getDb().runSync(
    'UPDATE calendars SET name = ?, color = ?, mark_style = ?, reminder = ?, updated_at = ?, dirty = 1 WHERE id = ?',
    [next.name, next.color, next.markStyle, next.reminder, now(), id],
  );
  emitChange('calendar');
};

export const reorderCalendars = (ids: string[]) => {
  const db = getDb();
  db.withTransactionSync(() => {
    ids.forEach((id, i) => {
      db.runSync('UPDATE calendars SET sort_order = ?, updated_at = ?, dirty = 1 WHERE id = ? AND sort_order != ?', [i, now(), id, i]);
    });
  });
  emitChange('calendar');
};

// 다른 기기에도 삭제가 전달되도록 행은 남기고 deleted 표시만 한다. 기록은 바로 지운다.
export const deleteCalendar = (id: string) => {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync('UPDATE calendars SET deleted = 1, updated_at = ?, dirty = 1 WHERE id = ?', [now(), id]);
    db.runSync('DELETE FROM records WHERE calendar_id = ?', [id]);
  });
  emitChange('calendar');
};

export const countRecords = (calendarId: string) =>
  getDb().getFirstSync<{ c: number }>("SELECT COUNT(*) AS c FROM records WHERE calendar_id = ? AND value != ''", [calendarId])?.c ?? 0;

// ---- 기록 ----

export const getRecordsInRange = (calendarId: string, from: string, to: string): Record<string, DayRecord> => {
  const rows = getDb().getAllSync<RecordRow>(
    'SELECT * FROM records WHERE calendar_id = ? AND date >= ? AND date <= ?',
    [calendarId, from, to],
  );
  const map: Record<string, DayRecord> = {};
  rows.forEach((r) => {
    map[r.date] = toRecord(r);
  });
  return map;
};

export const getAllRecords = (calendarId: string): DayRecord[] =>
  getDb()
    .getAllSync<RecordRow>("SELECT * FROM records WHERE calendar_id = ? AND value != '' ORDER BY date", [calendarId])
    .map(toRecord);

export const getRecord = (calendarId: string, date: string): DayRecord | null => {
  const row = getDb().getFirstSync<RecordRow>('SELECT * FROM records WHERE calendar_id = ? AND date = ?', [calendarId, date]);
  return row ? toRecord(row) : null;
};

export const nextValue = (v: MarkValue): MarkValue => (v === '' ? 'O' : v === 'O' ? 'X' : '');

// 빈칸 → O → X → 빈칸. 미래 날짜는 바꾸지 않는다. 바뀐 값을 돌려준다.
export const cycleRecord = (calendarId: string, date: string): MarkValue | null => {
  if (date > todayKey()) return null;
  const cur = getRecord(calendarId, date);
  const value = nextValue(cur?.value ?? '');
  saveRecord(calendarId, date, value, cur?.memo ?? '');
  return value;
};

// 동기화를 위해 빈칸도 행을 남긴다.
export const saveRecord = (calendarId: string, date: string, value: MarkValue, memo: string) => {
  if (date > todayKey()) return;
  getDb().runSync(
    `INSERT INTO records (calendar_id, date, value, memo, updated_at, dirty) VALUES (?, ?, ?, ?, ?, 1)
     ON CONFLICT(calendar_id, date) DO UPDATE SET value = excluded.value, memo = excluded.memo, updated_at = excluded.updated_at, dirty = 1`,
    [calendarId, date, value, memo, now()],
  );
  emitChange('record');
};

// ---- 설정(key-value) ----

export const getSetting = (key: string): string | null =>
  getDb().getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key])?.value ?? null;

export const setSetting = (key: string, value: string | null) => {
  if (value === null) getDb().runSync('DELETE FROM kv WHERE key = ?', [key]);
  else getDb().runSync('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
  emitChange('setting');
};

// ---- 동기화용 원시 접근 ----

export const getDirtyCalendarRows = () => getDb().getAllSync<CalendarRow>('SELECT * FROM calendars WHERE dirty = 1');
export const getDirtyRecordRows = () => getDb().getAllSync<RecordRow>('SELECT * FROM records WHERE dirty = 1');

// 올리는 사이에 또 바뀐 행은 dirty로 남겨둔다.
export const markCalendarClean = (id: string, updatedAt: number) =>
  getDb().runSync('UPDATE calendars SET dirty = 0 WHERE id = ? AND updated_at = ?', [id, updatedAt]);
export const markRecordClean = (calendarId: string, date: string, updatedAt: number) =>
  getDb().runSync('UPDATE records SET dirty = 0 WHERE calendar_id = ? AND date = ? AND updated_at = ?', [calendarId, date, updatedAt]);

export const markAllDirty = () => {
  const db = getDb();
  db.execSync('UPDATE calendars SET dirty = 1; UPDATE records SET dirty = 1;');
};

export const getCalendarRowAny = (id: string) => getDb().getFirstSync<CalendarRow>('SELECT * FROM calendars WHERE id = ?', [id]);

export const applyRemoteCalendar = (r: {
  id: string; name: string; color: string; markStyle: string; order: number; reminder: string | null;
  createdAt: number; updatedAt: number; deleted: boolean;
}) => {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO calendars (id, name, color, mark_style, sort_order, reminder, created_at, updated_at, deleted, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, color = excluded.color, mark_style = excluded.mark_style,
         sort_order = excluded.sort_order, reminder = excluded.reminder, updated_at = excluded.updated_at,
         deleted = excluded.deleted, dirty = 0`,
      [r.id, r.name, r.color, r.markStyle, r.order, r.reminder, r.createdAt, r.updatedAt, r.deleted ? 1 : 0],
    );
    if (r.deleted) db.runSync('DELETE FROM records WHERE calendar_id = ?', [r.id]);
  });
};

export const getRecordRowAny = (calendarId: string, date: string) =>
  getDb().getFirstSync<RecordRow>('SELECT * FROM records WHERE calendar_id = ? AND date = ?', [calendarId, date]);

export const applyRemoteRecord = (r: { calendarId: string; date: string; value: string; memo: string; updatedAt: number }) => {
  getDb().runSync(
    `INSERT INTO records (calendar_id, date, value, memo, updated_at, dirty) VALUES (?, ?, ?, ?, ?, 0)
     ON CONFLICT(calendar_id, date) DO UPDATE SET value = excluded.value, memo = excluded.memo, updated_at = excluded.updated_at, dirty = 0`,
    [r.calendarId, r.date, r.value, r.memo, r.updatedAt],
  );
};
