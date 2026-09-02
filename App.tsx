import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import {Image, StyleSheet, Text, View} from 'react-native';
import { Text as AppText } from './src/components/Text';
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
import { getReminderSettings, applyReminderSchedule } from "./src/api/notificationService";
import { registerPushToken } from "./src/api/pushTokenService";
import {FamilyProvider} from "./src/context/FamilyContext";
import FamilyScreen from "./src/screens/FamilyScreen";
import TreeStageDevScreen from "./src/screens/TreeStageDevScreen";
import ForceUpdateScreen from "./src/screens/ForceUpdateScreen";
import { checkForceUpdate, ForceUpdateInfo } from "./src/api/versionService";

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
    // 앱 실행 시 저장된 알림 설정에 맞춰 리마인더 재예약
    (async () => {
      const settings = await getReminderSettings();
      await applyReminderSchedule(settings);
    })();
  }, []);

  const [ appIsReady, setAppIsReady ] = useState(false);
  const [ user, setUser ] = useState<FirebaseAuthTypes.User | null>(null);
  const [ forceUpdateInfo, setForceUpdateInfo ] = useState<ForceUpdateInfo | null>(null);

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
        // 인증 이후에 체크: config/app 문서 조회에 로그인 상태가 필요할 수 있어서
        const updateInfo = await checkForceUpdate();
        setForceUpdateInfo(updateInfo);
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

  useEffect(() => {
    // 가족 소비 알림을 받으려면 구글 로그인 사용자여야 함 (익명 계정은 가족연결 자체가 안 됨)
    if (user && !user.isAnonymous) {
      registerPushToken(user.uid);
    }
  }, [user]);

  const onLayoutRootView = useCallback(async () => {
    // 네이티브 스플래시는 이 커스텀 부팅 화면이 뜨자마자 바로 내려간다.
    await SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}
                            onLayout={onLayoutRootView}>
      <DateProvider>
        <FamilyProvider>
          <SafeAreaProvider>
            <StatusBar style="auto" />

            {!appIsReady ? (
              <BootSplash />
            ) : forceUpdateInfo?.required ? (
              <ForceUpdateScreen
                message={forceUpdateInfo.message}
                storeUrl={forceUpdateInfo.storeUrl}
                webStoreUrl={forceUpdateInfo.webStoreUrl}
              />
            ) : (
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

                      {__DEV__ && (
                        <Stack.Screen
                          name="TreeStageDev"
                          component={TreeStageDevScreen}
                          options={{ headerShown: false }}
                        />
                      )}
                    </>
                  ) : (
                    <Stack.Screen name="LoginError" component={ErrorScreen} />
                  )}
                </Stack.Navigator>
              </NavigationContainer>
            )}
          </SafeAreaProvider>
        </FamilyProvider>
      </DateProvider>
    </GestureHandlerRootView>
  );
}

// 네이티브 스플래시(아이콘만) 다음에 이어서 보여주는 부팅 화면. 아이콘과 텍스트를 각각 실제 컴포넌트로 렌더링한다.
const BootSplash = () => (
  <View style={styles.bootSplash}>
    <Image
      source={require('./assets/splash-icon.png')}
      style={styles.bootSplashIcon}
      resizeMode="contain"
    />
    <AppText style={styles.bootSplashText}>오늘의 감성 소비 기록</AppText>
  </View>
);

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
  bootSplash: {
    flex: 1,
    backgroundColor: '#caebe4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bootSplashIcon: {
    // 네이티브 스플래시의 imageWidth(app.json expo-splash-screen 설정)와 동일하게 맞춰서 전환 시 크기 점프 방지
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  bootSplashText: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 18,
    color: '#192434',
  },
});
