import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Header, Txt } from '../components/ui';
import { useTheme } from '../theme';
import type { ScreenProps } from '../navigation';

const STEPS = [
  '홈 화면의 빈 곳을 길게 누르세요.',
  '[위젯]을 누르고 목록에서 "하루 OX 캘린더"를 찾으세요.',
  '"오늘 한 칸", "이번 주", "이번 달" 중 하나를 길게 눌러 홈 화면에 놓으세요.',
  '연결할 캘린더를 고르면 끝. 이제 위젯에서 날짜를 누르면 바로 기록 화면이 열려요.',
];

export default function WidgetGuideScreen({ navigation }: ScreenProps<'WidgetGuide'>) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <Header title="위젯 추가하는 법" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <Card style={{ padding: 18, gap: 16 }}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.step}>
              <View style={[styles.num, { backgroundColor: colors.ink }]}>
                <Txt weight="bold" style={{ color: colors.inverseText, fontSize: 13 }}>
                  {i + 1}
                </Txt>
              </View>
              <Txt style={{ flex: 1, lineHeight: 22 }}>{s}</Txt>
            </View>
          ))}
        </Card>
        <Txt style={{ color: colors.muted, fontSize: 13.5, lineHeight: 20 }}>
          위젯을 길게 누르고 [설정]을 고르면 연결된 캘린더를 바꿀 수 있어요. 휴대폰마다 메뉴 이름이 조금 다를 수 있어요.
        </Txt>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  num: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
