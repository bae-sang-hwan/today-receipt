import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from "../screens/HomeScreen";
import AddScreen from "../screens/AddScreen";
import ReportScreen from "../screens/ReportScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'home') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'add') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'report') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: 'gray',
        headerShown: false, // 상단 타이틀 바 숨김 (커스텀 헤더 사용 권장)
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
        options={{ tabBarLabel: '리포트' }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;