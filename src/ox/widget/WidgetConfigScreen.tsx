import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';
import { Button, Card, Row, Tap, Txt } from '../components/ui';
import { ThemeProvider, useTheme } from '../theme';
import { listCalendars } from '../db/repo';
import { getWidgetConfig, isPremium, setWidgetConfig, type WidgetTheme } from '../db/settings';
import { renderWidgetFor, resolveWidget } from './widgets';

// W04 위젯 설정: 위젯을 홈 화면에 놓을 때, 또는 위젯을 길게 눌러 [설정]을 고를 때 열린다.
const ConfigBody = ({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) => {
  const { colors } = useTheme();
  const calendars = listCalendars();
  const premium = isPremium();
  const current = getWidgetConfig(widgetInfo.widgetId);
  const [calendarId, setCalendarId] = useState(current?.calendarId ?? resolveWidget(widgetInfo.widgetId).calendar?.id ?? null);
  const [theme, setTheme] = useState<WidgetTheme>(current?.theme ?? 'light');

  const done = () => {
    if (!calendarId) return;
    setWidgetConfig(widgetInfo.widgetId, { calendarId, theme });
    renderWidget(renderWidgetFor(widgetInfo.widgetName, widgetInfo.widgetId));
    setResult('ok');
  };

  if (calendars.length === 0) {
    return (
      <View style={styles.empty}>
        <Txt weight="extrabold" style={{ fontSize: 20, textAlign: 'center' }}>
          먼저 앱에서 캘린더를 만들어 주세요
        </Txt>
        <Txt style={{ color: colors.muted, textAlign: 'center' }}>하루 OX 캘린더를 열고 기록할 것을 정하면 위젯을 쓸 수 있어요.</Txt>
        <Button title="닫기" onPress={() => setResult('cancel')} style={{ alignSelf: 'stretch', marginTop: 8 }} />
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.body}>
        <Txt weight="extrabold" style={{ fontSize: 22 }}>
          위젯 설정
        </Txt>
        <View style={{ gap: 8 }}>
          <Txt style={{ fontSize: 13, color: colors.muted }}>연결할 캘린더</Txt>
          <Card>
            {calendars.map((c, i) => (
              <Row
                key={c.id}
                title={c.name}
                onPress={() => setCalendarId(c.id)}
                chevron={false}
                last={i === calendars.length - 1}
                left={<View style={[styles.dot, { backgroundColor: c.color }]} />}
                right={c.id === calendarId ? <Ionicons name="checkmark" size={20} color={colors.o} /> : null}
              />
            ))}
          </Card>
        </View>
        <View style={{ gap: 8 }}>
          <Txt style={{ fontSize: 13, color: colors.muted }}>위젯 테마</Txt>
          <View style={styles.themes}>
            {(['light', 'dark'] as WidgetTheme[]).map((t) => {
              const locked = t === 'dark' && !premium;
              const on = theme === t;
              return (
                <Tap
                  key={t}
                  hapticStyle={locked ? 'warning' : 'tap'}
                  onPress={() => !locked && setTheme(t)}
                  style={[styles.theme, { borderColor: on ? colors.o : colors.line, backgroundColor: colors.surface, opacity: locked ? 0.5 : 1 }]}
                >
                  <View style={[styles.swatch, { backgroundColor: t === 'light' ? '#FFFFFF' : '#181E25', borderColor: colors.line }]} />
                  <Txt weight="medium">{t === 'light' ? '밝게' : '어둡게'}</Txt>
                  {locked ? <Txt style={{ fontSize: 11.5, color: colors.x }}>프리미엄</Txt> : null}
                </Tap>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button title="완료" onPress={done} disabled={!calendarId} />
        <Button title="취소" variant="ghost" onPress={() => setResult('cancel')} />
      </View>
    </>
  );
};

const Themed = (props: WidgetConfigurationScreenProps) => {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ConfigBody {...props} />
    </SafeAreaView>
  );
};

export function WidgetConfigScreen(props: WidgetConfigurationScreenProps) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Themed {...props} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 20 },
  empty: { flex: 1, justifyContent: 'center', padding: 28, gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  themes: { flexDirection: 'row', gap: 10 },
  theme: { flex: 1, borderWidth: 1.5, borderRadius: 12, alignItems: 'center', paddingVertical: 14, gap: 6 },
  swatch: { width: 36, height: 36, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  footer: { paddingHorizontal: 20, paddingBottom: 12, gap: 6 },
});
