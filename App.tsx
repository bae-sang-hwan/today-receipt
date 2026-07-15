import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import {Platform, StyleSheet, Text, View} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {useCallback, useEffect, useState} from "react";
import {getOrCreateUser} from "./src/api/authService";
import TabNavigator from "./src/components/TabNavigator";
import {SafeAreaProvider} from "react-native-safe-area-context";
import {DateProvider} from "./src/context/DateContext";
import DetailScreen from "./src/screens/DetailScreen";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import ModifyScreen from "./src/screens/ModifyScreen";
import SaveCompleteScreen from "./src/screens/SaveCompleteScreen";
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { enableScreens } from 'react-native-screens';
import * as Notifications from 'expo-notifications';
import {SchedulableTriggerInputTypes} from "expo-notifications";
import {FamilyProvider} from "./src/context/FamilyContext";
import FamilyScreen from "./src/screens/FamilyScreen";

enableScreens(false);

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // 알림이 화면 상단에 배너로 뜸
    shouldShowList: true,   // 알림 센터(드롭다운 목록)에 표시됨
  }),
});

export default function App() {

  useEffect(() => {
    // 앱 실행 시 알림 설정 프로세스 시작
    configureNotifications();
  }, []);

  const configureNotifications = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('알림 권한 거부됨');
      return;
    }

    // 3. 안드로이드 전용 채널 설정 (중요!)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX, // 중요도 설정
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // 4. 기존 예약된 알림 모두 삭제 (중복 방지)
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 5. 매일 20시 알림 예약 함수 호출
    await scheduleDailyPushNotification();
  };

  const scheduleDailyPushNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "오늘의 영수증 기록하셨나요?",
        body: '오늘 하루의 소비를 정리하고 감정을 기록해보세요!',
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
        channelId: 'default',
      } as any,
    });
    console.log("매일 20시 알림 예약 완료");
  };

  const [ appIsReady, setAppIsReady ] = useState(false);
  const [ user, setUser ] = useState<FirebaseAuthTypes.User | null>(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        // 🔴 로그아웃 되어서 currentUser가 null이라면 즉시 다시 익명 로그인 시도
        console.log("로그아웃 감지: 익명 로그인을 재시도합니다.");
        try {
          const newUser = await getOrCreateUser();
          setUser(newUser);
        } catch (e) {
          console.error("재로그인 에러:", e);
        }
      } else {
        // 로그인 상태라면 유저 정보 세팅
        setUser(currentUser);
      }
    });

    async function prepare() {
      try {
        await Font.loadAsync(Ionicons.font);
        // 초기 구동 시 유저 생성 (이미 되어있다면 내부에서 fetch)
        await getOrCreateUser();
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn("초기화 에러:", e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();

    return () => unsubscribe();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}
                            onLayout={onLayoutRootView}>
      <DateProvider>
        <FamilyProvider>
          <SafeAreaProvider>
            <StatusBar style="auto" />

            <NavigationContainer>
              <Stack.Navigator>
                {user ? (
                  <>
                    {/* 1. 메인 탭 화면 (홈, 추가, 리포트 포함) */}
                    <Stack.Screen
                      name="Root"
                      component={TabNavigator}
                      options={{ headerShown: false }}
                    />

                    {/* 2. 상세 페이지 */}
                    <Stack.Screen
                      name="Detail"
                      component={DetailScreen}
                      options={{ headerShown: false }}
                    />

                    {/* 2. 수정 페이지 */}
                    <Stack.Screen
                      name="Modify"
                      component={ModifyScreen}
                      options={{ headerShown: false }}
                    />

                    <Stack.Screen
                      name="SaveComplete"
                      component={SaveCompleteScreen}
                      options={{
                        headerShown: false,
                        gestureEnabled: false // 뒤로가기 방지 (선택 사항)
                      }}
                    />

                    <Stack.Screen
                      name="Family"
                      component={FamilyScreen}
                      options={{ headerShown: false }}
                    />
                  </>
                ) : (
                  <Stack.Screen name="LoginError" component={ErrorScreen} />
                )}
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaProvider>
        </FamilyProvider>
      </DateProvider>
    </GestureHandlerRootView>
  );
}

const ErrorScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>로그인에 실패했습니다. 인터넷 연결을 확인해주세요.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
