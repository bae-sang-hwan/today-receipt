import { getSetting, setSetting } from './repo';
import type { WeekStart } from '../domain/date';

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

export const isPremium = () => getSetting('premium') === '1';
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
