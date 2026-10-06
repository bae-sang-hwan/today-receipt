import { registerRootComponent } from 'expo';
import { registerWidgetConfigurationScreen, registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './src/ox/widget/taskHandler';
import { WidgetConfigScreen } from './src/ox/widget/WidgetConfigScreen';

// 홈 화면 위젯: 앱이 꺼져 있어도 클릭을 처리하고, 위젯을 놓을 때 설정 화면을 띄운다.
registerWidgetTaskHandler(widgetTaskHandler);
registerWidgetConfigurationScreen(WidgetConfigScreen);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
