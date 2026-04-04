import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
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

enableScreens(false);

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

export default function App() {

  const [ appIsReady, setAppIsReady ] = useState(false);
  const [ user, setUser ] = useState<FirebaseAuthTypes.User | null>(null);

  useEffect(() => {
    // 1. 로그인 상태 감시자 설정 (가장 정확한 방법)
    const unsubscribe = auth().onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      // 유저 정보가 확정되면 앱 준비 완료로 간주 (필요 시)
    });

    async function prepare() {
      try {
        await Font.loadAsync(Ionicons.font);

        // 2. 익명 로그인 또는 유저 생성 로직 실행
        // 이미 로그인되어 있다면 authService 내부에서 처리될 것입니다.
        const loggedInUser = await getOrCreateUser();

        // 1초 대기 (스플래시 체류 시간)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn("초기화 에러:", e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();

    // 언마운트 시 감시자 해제
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
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <DateProvider>
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
                </>
              ) : (
                <Stack.Screen name="LoginError" component={ErrorScreen} />
              )}
            </Stack.Navigator>
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
