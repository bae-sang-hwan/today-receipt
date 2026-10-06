import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import auth from '@react-native-firebase/auth';
import { Card, Header, OptionSheet, Row, Tap, Txt } from '../components/ui';
import { useTheme } from '../theme';
import { useDataVersion, usePremium } from '../hooks';
import { listCalendars } from '../db/repo';
import { getThemeSetting, getWeekStart, setThemeSetting, setWeekStart, type ThemeSetting } from '../db/settings';
import type { WeekStart } from '../domain/date';
import { CONTACT_EMAIL, PRIVACY_POLICY_URL } from '../config';
import type { ScreenProps } from '../navigation';

const THEME_LABEL: Record<ThemeSetting, string> = { system: '시스템', light: '밝게', dark: '어둡게' };
const WEEK_LABEL: Record<WeekStart, string> = { sun: '일요일', mon: '월요일' };

// S07 설정
export default function SettingsScreen({ navigation }: ScreenProps<'Settings'>) {
  const { colors } = useTheme();
  const version = useDataVersion();
  const premium = usePremium();
  const [sheet, setSheet] = useState<'theme' | 'week' | null>(null);

  const calendarCount = useMemo(() => listCalendars().length, [version]);
  const theme = useMemo(() => getThemeSetting(), [version]);
  const weekStart = useMemo(() => getWeekStart(), [version]);
  const user = auth().currentUser;
  const syncOn = !!user && !user.isAnonymous;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <Header title="설정" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        {premium ? (
          <Card>
            <Row title="프리미엄 사용 중" sub="광고 없이, 캘린더 무제한" />
          </Card>
        ) : (
          <Tap onPress={() => navigation.navigate('Premium')} style={[styles.pro, { backgroundColor: colors.ink }]}>
            <Txt weight="bold" style={{ color: colors.inverseText, fontSize: 16 }}>
              프리미엄으로 업그레이드
            </Txt>
            <Txt style={{ color: colors.inverseText, opacity: 0.75, fontSize: 13 }}>광고 없이, 캘린더 무제한 · 한 번만 결제</Txt>
          </Tap>
        )}

        <Card>
          <Row title="캘린더 관리" value={`${calendarCount}개`} onPress={() => navigation.navigate('CalendarManage')} />
          <Row title="한 주의 시작" value={WEEK_LABEL[weekStart]} onPress={() => setSheet('week')} />
          <Row title="화면 테마" value={THEME_LABEL[theme]} onPress={() => setSheet('theme')} last />
        </Card>

        <Card>
          <Row
            title="백업 및 동기화"
            sub={syncOn ? (user?.email ?? 'Google 계정 연결됨') : 'Google로 로그인하면 자동 백업'}
            value={syncOn ? '켜짐' : '꺼짐'}
            onPress={() => navigation.navigate('Sync')}
            last
          />
        </Card>

        <Card>
          <Row title="위젯 추가하는 법" onPress={() => navigation.navigate('WidgetGuide')} />
          {CONTACT_EMAIL ? <Row title="문의하기" value={CONTACT_EMAIL} onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} /> : null}
          {PRIVACY_POLICY_URL ? <Row title="개인정보처리방침" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} /> : null}
          <Row title="버전" value={Constants.expoConfig?.version ?? '-'} last />
        </Card>
        <View style={{ height: 8 }} />
      </ScrollView>

      <OptionSheet
        visible={sheet === 'week'}
        title="한 주의 시작"
        value={weekStart}
        options={[
          { value: 'sun', label: '일요일' },
          { value: 'mon', label: '월요일' },
        ]}
        onSelect={setWeekStart}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'theme'}
        title="화면 테마"
        value={theme}
        options={[
          { value: 'system', label: '시스템 설정 따르기' },
          { value: 'light', label: '밝게' },
          { value: 'dark', label: '어둡게' },
        ]}
        onSelect={setThemeSetting}
        onClose={() => setSheet(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12 },
  pro: { borderRadius: 14, padding: 16, gap: 3 },
});
