import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { renderWidgetFor, WIDGET_NAMES } from '../widget/widgets';

// 앱에서 기록이나 캘린더가 바뀌면 홈 화면 위젯을 즉시 다시 그린다.
export const refreshAllWidgets = async () => {
  if (Platform.OS !== 'android') return;
  for (const widgetName of WIDGET_NAMES) {
    try {
      await requestWidgetUpdate({
        widgetName,
        renderWidget: (info) => renderWidgetFor(widgetName, info.widgetId),
      });
    } catch (e) {
      console.warn('위젯 갱신 실패:', e);
    }
  }
};
