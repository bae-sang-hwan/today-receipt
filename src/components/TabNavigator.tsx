import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 하단 여백 자동 계산용
import HomeScreen from "../screens/HomeScreen";
import AddScreen from "../screens/AddScreen";
import ReportScreen from "../screens/ReportScreen";
import SettingScreen from "../screens/SettingScreen";
import {colors} from "../theme/colors";

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const insets = useSafeAreaInsets(); // 디바이스별 하단 바 높이 가저오기

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName;

          // HTML 테마에 부합하도록 정밀한 Ionicons 아이콘 세팅 매칭
          if (route.name === 'home') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'add') {
            iconName = focused ? 'add' : 'add-outline'; // 명세의 슬림한 십자가 형태 매칭
          } else if (route.name === 'report') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'setting') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName as any} size={22} color={color} />;
        },

        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: colors.placeHolder,
        headerShown: false,

        // 하단 디바이스 바 가림 해결 및 스타일 고도화
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.o5,
          fontFamily: 'Pretendard-Bold',

          // 고정 높이 대신 디바이스 고유 하단 여백(insets.bottom)을 합산하여 가림 방지
          height: 64 + (insets.bottom > 0 ? insets.bottom : 12),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          paddingTop: 8,

          // 그림자 은은하게 처리
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.02,
          shadowRadius: 12,
          elevation: 0,
        },
        // 하단 텍스트 라벨 스타일 정의 (2차 명세 반영)
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700', // 2차 프리미엄 700 반영
          marginTop: 4,
        }
      })}
    >
      <Tab.Screen
        name="home"
        component={HomeScreen}
        options={{ tabBarLabel: '홈' }}
      />
      <Tab.Screen
        name="add"
        component={AddScreen}
        options={{ tabBarLabel: '추가' }}
      />
      <Tab.Screen
        name="report"
        component={ReportScreen}
        options={{ tabBarLabel: '통계' }}
      />
      <Tab.Screen
        name="setting"
        component={SettingScreen}
        options={{ tabBarLabel: '설정' }}
      />
    </Tab.Navigator>
  );
};

// 2차 리디자인 마이크로 인터랙션을 위한 스타일시트 추가
const styles = StyleSheet.create({
  iconWrapper: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperActive: {
    backgroundColor: colors.placeHolder, // 2차 리디자인에서 제공한 선택 메뉴 전용 소프트 캡슐 배경
  },
});

export default TabNavigator;