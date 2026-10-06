import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { cycleRecord } from '../db/repo';
import { setWidgetConfig } from '../db/settings';
import { todayKey } from '../domain/date';
import { haptic } from '../haptics';
import { renderWidgetFor, resolveWidget } from './widgets';
import { refreshAllWidgets } from '../services/widgetSync';
import { rescheduleReminders } from '../services/reminders';

// 앱이 꺼져 있어도 실행된다. 기록은 기기 저장소에 바로 쓰고(dirty 표시),
// 서버 동기화는 다음에 앱을 열 때 한다.
export async function widgetTaskHandler({ widgetInfo, widgetAction, clickAction, clickActionData, renderWidget }: WidgetTaskHandlerProps) {
  const { widgetName, widgetId } = widgetInfo;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      renderWidget(renderWidgetFor(widgetName, widgetId));
      break;

    case 'WIDGET_DELETED':
      setWidgetConfig(widgetId, null);
      break;

    case 'WIDGET_CLICK': {
      if (clickAction !== 'TOGGLE') break;
      const { calendar } = resolveWidget(widgetId);
      if (!calendar) break;
      // "오늘 한 칸"은 누른 순간의 날짜를 쓴다. 자정 직후 위젯이 아직 어제를 보여줘도 오늘에 기록된다.
      const date = clickActionData?.today ? todayKey() : String(clickActionData?.date ?? '');
      if (!date) break;
      if (cycleRecord(calendar.id, date) === null) break;
      haptic.mark();
      renderWidget(renderWidgetFor(widgetName, widgetId));
      // 같은 캘린더를 보여주는 다른 위젯도 맞춘다.
      await refreshAllWidgets();
      await rescheduleReminders();
      break;
    }
  }
}
