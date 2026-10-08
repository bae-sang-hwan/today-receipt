import React, { useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from './theme';
import { PremiumProvider } from './services/premium';
import { getDb } from './db/database';
import { listCalendars, subscribe } from './db/repo';
import { refreshAllWidgets } from './services/widgetSync';
import { rescheduleReminders } from './services/reminders';
import { scheduleSync, syncNow } from './services/sync';
import { navigationRef, type RootStackParamList } from './navigation';

import OnboardingScreen from './screens/OnboardingScreen';
import MainScreen from './screens/MainScreen';
import CalendarManageScreen from './screens/CalendarManageScreen';
import CalendarEditScreen from './screens/CalendarEditScreen';
import StatsScreen from './screens/StatsScreen';
import SettingsScreen from './screens/SettingsScreen';
import PremiumScreen from './screens/PremiumScreen';
import SyncScreen from './screens/SyncScreen';
import WidgetGuideScreen from './screens/WidgetGuideScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const Stack = createNativeStackNavigator<RootStackParamList>();

// 위젯의 "haruox://calendar/{id}" 링크로 해당 캘린더를 열고, 뒤에 날짜("YYYY-MM-DD" 또는 "today")가 있으면 기록 모달도 띄운다.
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['haruox://'],
  config: { screens: { Main: 'calendar/:calendarId/:date?' } },
};

const openCalendarFromNotification = (response: Notifications.NotificationResponse | null) => {
  const calendarId = response?.notification.request.content.data?.calendarId;
  if (typeof calendarId !== 'string' || !navigationRef.isReady()) return;
  navigationRef.navigate('Main', { calendarId });
};

// 기록이 바뀌면 위젯 갱신, 알림 재예약, 서버 동기화를 한 번에 몰아서 한다.
const useBackgroundEffects = () => {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let dataChanged = false;
    const unsub = subscribe((kind) => {
      if (kind !== 'setting') dataChanged = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        refreshAllWidgets();
        if (dataChanged) {
          dataChanged = false;
          rescheduleReminders();
          scheduleSync();
        }
      }, 300);
    });

    const onForeground = () => {
      syncNow();
      rescheduleReminders();
      refreshAllWidgets(); // 자정이 지났으면 위젯의 "오늘"을 맞춘다.
    };
    onForeground();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && onForeground());

    return () => {
      unsub();
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, []);
};

const Navigator = ({ initialRoute }: { initialRoute: keyof RootStackParamList }) => {
  const { colors, isDark } = useTheme();
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: { ...(isDark ? DarkTheme : DefaultTheme).colors, background: colors.bg, card: colors.bg, text: colors.ink, border: colors.line },
  };

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(openCalendarFromNotification);
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer
        ref={navigationRef}
        theme={navTheme}
        linking={linking}
        onReady={() => Notifications.getLastNotificationResponseAsync().then(openCalendarFromNotification).catch(() => {})}
      >
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Main" component={MainScreen} />
          <Stack.Screen name="CalendarManage" component={CalendarManageScreen} />
          <Stack.Screen name="CalendarEdit" component={CalendarEditScreen} />
          <Stack.Screen name="Stats" component={StatsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Premium" component={PremiumScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Sync" component={SyncScreen} />
          <Stack.Screen name="WidgetGuide" component={WidgetGuideScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

export default function OxApp() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Onboarding');

  useBackgroundEffects();

  useEffect(() => {
    (async () => {
      try {
        getDb();
        setInitialRoute(listCalendars().length > 0 ? 'Main' : 'Onboarding');
        await Font.loadAsync(Ionicons.font);
      } catch (e) {
        console.warn('초기화 에러:', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const onLayout = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PremiumProvider>
            <View style={{ flex: 1 }} onLayout={onLayout}>
              <Navigator initialRoute={initialRoute} />
            </View>
          </PremiumProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
