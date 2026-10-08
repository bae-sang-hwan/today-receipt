import { createNavigationContainerRef } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: { calendarId?: string; date?: string } | undefined;
  CalendarManage: undefined;
  CalendarEdit: { id?: string } | undefined;
  Stats: { calendarId: string };
  Settings: undefined;
  Premium: undefined;
  Sync: undefined;
  WidgetGuide: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
