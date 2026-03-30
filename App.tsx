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
import TabNavigator from "./src/components/TabNavigator";
import {SafeAreaProvider} from "react-native-safe-area-context";
import {DateProvider} from "./src/context/DateContext";
import DetailScreen from "./src/screens/DetailScreen";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import ModifyScreen from "./src/screens/ModifyScreen";
import SaveCompleteScreen from "./src/screens/SaveCompleteScreen";

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

export default function App() {

  const [ appIsReady, setAppIsReady ] = useState(false);
  const [ user, setUser ] = useState<User | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync(Ionicons.font);

        const loggedInUser = await getOrCreateUser();
        setUser(loggedInUser);

        // await auth().signInAnonymously();

        await new Promise(resolve => setTimeout(resolve, 1000));
        // ---------------------------------------------------

      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DateProvider>
        <SafeAreaProvider>
          <NavigationContainer onReady={onLayoutRootView}>
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
