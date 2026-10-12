import { getSetting, setSetting } from './repo';
import { todayKey, type WeekStart } from '../domain/date';

export type ThemeSetting = 'system' | 'light' | 'dark';
export type WidgetTheme = 'light' | 'dark';

export interface WidgetConfig {
  calendarId: string;
  theme: WidgetTheme;
}

export const getWeekStart = (): WeekStart => (getSetting('week_start') === 'mon' ? 'mon' : 'sun');
export const setWeekStart = (v: WeekStart) => setSetting('week_start', v);

export const getThemeSetting = (): ThemeSetting => {
  const v = getSetting('theme');
  return v === 'light' || v === 'dark' ? v : 'system';
};
export const setThemeSetting = (v: ThemeSetting) => setSetting('theme', v);

// 개발 빌드에서는 설정 화면 스위치로 프리미엄을 강제로 켤 수 있다. Play 구매 내역 확인과 따로 저장해서
// 앱을 켤 때 구매 내역이 없다고 꺼지지 않는다. 출시 빌드에서는 무시된다.
export const isDevPremium = () => __DEV__ && getSetting('dev_premium') === '1';
export const setDevPremium = (v: boolean) => setSetting('dev_premium', v ? '1' : null);

export const isPremium = () => getSetting('premium') === '1' || isDevPremium();
export const setPremium = (v: boolean) => setSetting('premium', v ? '1' : null);

export const getLastCalendarId = () => getSetting('last_calendar');
export const setLastCalendarId = (id: string) => setSetting('last_calendar', id);

export const getWidgetConfig = (widgetId: number): WidgetConfig | null => {
  const raw = getSetting(`widget:${widgetId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WidgetConfig;
  } catch {
    return null;
  }
};
export const setWidgetConfig = (widgetId: number, config: WidgetConfig | null) =>
  setSetting(`widget:${widgetId}`, config ? JSON.stringify(config) : null);

// 주/월 위젯에서 ◀ ▶로 넘긴 칸 수(0 = 이번 주/달, -1 = 지난 주/달). 날짜가 바뀌면 이번으로 돌아온다.
export const getWidgetPage = (widgetId: number): number => {
  const raw = getSetting(`widget_page:${widgetId}`);
  if (!raw) return 0;
  try {
    const { offset, day } = JSON.parse(raw) as { offset: number; day: string };
    return day === todayKey() && Number.isInteger(offset) ? offset : 0;
  } catch {
    return 0;
  }
};
export const setWidgetPage = (widgetId: number, offset: number | null) =>
  setSetting(`widget_page:${widgetId}`, offset ? JSON.stringify({ offset, day: todayKey() }) : null);

// 동기화 상태
export const getLastPull = () => Number(getSetting('sync_last_pull') ?? 0);
export const setLastPull = (ms: number) => setSetting('sync_last_pull', String(ms));
export const getLastSyncAt = () => {
  const v = getSetting('sync_last_at');
  return v ? Number(v) : null;
};
export const setLastSyncAt = (ms: number | null) => setSetting('sync_last_at', ms === null ? null : String(ms));
// 마지막 동기화 실패의 에러 코드(예: "firestore/permission-denied"). 성공하면 지운다.
export const getSyncError = () => getSetting('sync_error');
export const setSyncError = (code: string | null) => setSetting('sync_error', code);
