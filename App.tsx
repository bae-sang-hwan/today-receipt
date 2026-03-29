import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {useCallback, useEffect, useState} from "react";
import {getOrCreateUser} from "./src/api/authService";
import { User } from 'firebase/auth';
import { auth } from './src/api/firebaseConfig';
import HomeScreen from "./src/screens/HomeScreen";
import TabNavigator from "./src/components/TabNavigator";
import {SafeAreaProvider} from "react-native-safe-area-context";
import {DateProvider} from "./src/context/DateContext";
import DetailScreen from "./src/screens/DetailScreen";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import ModifyScreen from "./src/screens/ModifyScreen";

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

export default function App() {

  const [ appIsReady, setAppIsReady ] = useState(false);
  const [ user, setUser ] = useState<User | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        // --- [핵심 로직] 여기에 초기화 작업을 넣습니다 ---
        // 예 1: 폰트 미리 로딩
        await Font.loadAsync(Ionicons.font);

        // 예 2: Firebase 초기화 및 익명 로그인 확인 (나중에 구현)

        const loggedInUser = await getOrCreateUser();
        setUser(loggedInUser);

        // await auth().signInAnonymously();

        // 예 3: 아주 잠깐 일부러 대기 (스플래시 화면이 너무 순식간에 지나갈 때 사용)
        await new Promise(resolve => setTimeout(resolve, 1000));
        // ---------------------------------------------------

      } catch (e) {
        console.warn(e);
      } finally {
        // 초기화 완료
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // 2. 초기화 완료 시 스플래시 화면 숨기기
  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // 이 함수는 루트 뷰가 그려질 때 호출됩니다.
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null; // 초기화 중에는 아무것도 그리지 않습니다. (스플래시 화면 유지)
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DateProvider>
        <SafeAreaProvider>
          <NavigationContainer onReady={onLayoutRootView}>
            <Stack.Navigator>
              {user ? (
                // 로그인 성공 시
                <>
                  {/* 1. 메인 탭 화면 (홈, 추가, 리포트 포함) */}
                  <Stack.Screen
                    name="Root"
                    component={TabNavigator}
                    options={{ headerShown: false }}
                  />

                  {/* 2. 상세 페이지 (탭 바가 숨겨짐) */}
                  <Stack.Screen
                    name="Detail"
                    component={DetailScreen}
                    options={{ headerShown: false }}
                  />

                  {/* 2. 수정 페이지 (탭 바가 숨겨짐) */}
                  <Stack.Screen
                    name="Modify"
                    component={ModifyScreen}
                    options={{ headerShown: false }}
                  />
                </>
              ) : (
                <Stack.Screen name="LoginError" component={ErrorScreen} />
              )}
            </Stack.Navigator>
            <StatusBar style="auto" />
          </NavigationContainer>
        </SafeAreaProvider>
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
