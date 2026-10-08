import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getWidgetPage, setWidgetConfig, setWidgetPage } from '../db/settings';
import { haptic } from '../haptics';
import { renderWidgetFor } from './widgets';

// 앱이 꺼져 있어도 실행된다. 날짜를 누르면 위젯이 앱의 기록 모달을 딥링크로 열기 때문에
// 여기서는 그리기, 정리, 주/월 넘기기만 한다.
export async function widgetTaskHandler({ widgetInfo, widgetAction, clickAction, renderWidget }: WidgetTaskHandlerProps) {
  const { widgetName, widgetId } = widgetInfo;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      renderWidget(renderWidgetFor(widgetName, widgetId));
      break;

    case 'WIDGET_DELETED':
      setWidgetConfig(widgetId, null);
      setWidgetPage(widgetId, null);
      break;

    case 'WIDGET_CLICK': {
      const page = getWidgetPage(widgetId);
      // 이번 주/달보다 뒤로는 넘기지 않는다(기록할 수 없는 날뿐이라).
      const next = clickAction === 'PREV' ? page - 1 : clickAction === 'NEXT' ? Math.min(0, page + 1) : clickAction === 'CURRENT' ? 0 : page;
      if (next === page) break;
      haptic.tap();
      setWidgetPage(widgetId, next);
      renderWidget(renderWidgetFor(widgetName, widgetId));
      break;
    }
  }
}
