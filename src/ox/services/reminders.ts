import { Linking } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { getRecordsInRange, listCalendars } from '../db/repo';
import { addDays, parseDateKey, todayKey } from '../domain/date';
import { REMINDER_SCHEDULE_DAYS } from '../config';

const CHANNEL_ID = 'reminder';

export const hasNotificationPermission = async () => (await Notifications.getPermissionsAsync()).status === 'granted';

// 이 앱의 시스템 알림 설정 화면을 연다. 실패하면 앱 정보 화면으로 대신 간다.
export const openNotificationSettings = async () => {
  const pkg = Constants.expoConfig?.android?.package;
  try {
    if (!pkg) throw new Error('no package');
    await Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [{ key: 'android.provider.extra.APP_PACKAGE', value: pkg }]);
  } catch {
    await Linking.openSettings();
  }
};

export const ensureNotificationPermission = async () => {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
};

// 로컬 알림은 울리는 순간에 조건을 확인할 수 없다. 그래서 앞으로 30일치를 날짜별로 예약하되,
// 이미 O/X를 기록한 날은 빼고 예약한다. 기록이 바뀔 때마다 다시 예약한다.
let running: Promise<void> | null = null;
let again = false;

export const rescheduleReminders = async () => {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await scheduleAll();
      } while (again);
    } catch (e) {
      console.warn('알림 예약 실패:', e);
    } finally {
      running = null;
    }
  })();
  return running;
};

const scheduleAll = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const calendars = listCalendars().filter((c) => c.reminder);
  if (calendars.length === 0) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '매일 기록 알림',
    importance: Notifications.AndroidImportance.HIGH,
  });

  const today = todayKey();
  const last = addDays(today, REMINDER_SCHEDULE_DAYS - 1);
  const nowMs = Date.now();

  for (const cal of calendars) {
    const [h, m] = cal.reminder!.split(':').map(Number);
    const records = getRecordsInRange(cal.id, today, last);
    for (let i = 0; i < REMINDER_SCHEDULE_DAYS; i++) {
      const key = addDays(today, i);
      if ((records[key]?.value ?? '') !== '') continue;
      const at = parseDateKey(key);
      at.setHours(h, m, 0, 0);
      if (at.getTime() <= nowMs) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `오늘 ${cal.name}, 기록하셨나요?`,
          body: '오늘 하루를 O, X로 남겨보세요.',
          data: { calendarId: cal.id },
        },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
      });
    }
  }
};
