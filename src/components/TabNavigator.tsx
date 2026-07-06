import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import HomeScreen from "../screens/HomeScreen";
import AddScreen from "../screens/AddScreen";
import ReportScreen from "../screens/ReportScreen";
import SettingScreen from "../screens/SettingScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
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

          // HTML 규격에 맞는 아이콘 크기 (22px) 강제 지정
          return <Ionicons name={iconName as any} size={22} color={color} />;
        },
        // HTML 테마 반영: 활성화 라벤더 파스텔, 비활성화 소프트 그레이
        tabBarActiveTintColor: '#b39ddb',
        tabBarInactiveTintColor: '#a0aec0',
        headerShown: false,

        // 부드러운 하단 탭바 컨테이너 스타일링 (HTML 명세 반영)
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#edf2f7',
          height: Platform.OS === 'ios' ? 88 : 76, // iOS 기기의 노치 여백 확보 및 기준 높이 76px 설정
          paddingBottom: Platform.OS === 'ios' ? 24 : 12, // 감성적인 하단 패딩 배치
          paddingTop: 8,
          boxShadow: 'none', // 하단 내비게이션 바의 그림자 최소화
          elevation: 0,
        },
        // 하단 텍스트 탭바 라벨 세부 서식 변경
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600', // HTML의 font-weight: 600 반영
          marginTop: 2,
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

export default TabNavigator;