import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

const ENABLED_KEY = '@today_receipt:reminder_enabled';

const REMINDER_HOUR = 20;
const REMINDER_MINUTE = 0;

export interface ReminderSettings {
  enabled: boolean;
}

const DEFAULT_SETTINGS: ReminderSettings = { enabled: true };

export const getReminderSettings = async (): Promise<ReminderSettings> => {
  try {
    const enabledStr = await AsyncStorage.getItem(ENABLED_KEY);
    return {
      enabled: enabledStr !== null ? enabledStr === 'true' : DEFAULT_SETTINGS.enabled,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveReminderSettings = async (settings: ReminderSettings): Promise<void> => {
  await AsyncStorage.setItem(ENABLED_KEY, String(settings.enabled));
};

/**
 * 저장된 설정에 맞춰 매일 알림을 다시 예약한다.
 * 알림 권한이 거부되면 false를 반환한다 (설정 화면에서 안내 메시지를 띄우기 위함).
 */
export const applyReminderSchedule = async (settings: ReminderSettings): Promise<boolean> => {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!settings.enabled) {
    return true;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '오늘의 영수증 기록하셨나요?',
      body: '오늘 하루의 소비를 정리하고 감정을 기록해보세요!',
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: REMINDER_MINUTE,
      channelId: 'default',
    } as any,
  });

  return true;
};
