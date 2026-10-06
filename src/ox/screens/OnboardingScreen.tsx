import React, { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Tap, Txt } from '../components/ui';
import { useTheme, fonts, CALENDAR_COLORS } from '../theme';
import { createCalendar, updateCalendar } from '../db/repo';
import { NAME_MAX_LENGTH } from '../config';
import { ensureNotificationPermission } from '../services/reminders';
import type { ScreenProps } from '../navigation';

const SUGGESTIONS = ['운동', '금주', '약 먹기', '공부', '일기', '영어'];

// S01 첫 실행: 첫 캘린더 이름만 받고 바로 메인으로 보낸다.
export default function OnboardingScreen({ navigation }: ScreenProps<'Onboarding'>) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const trimmed = name.trim();

  const start = async () => {
    if (!trimmed) return;
    const cal = createCalendar({ name: trimmed, color: CALENDAR_COLORS[0] });
    navigation.reset({ index: 0, routes: [{ name: 'Main', params: { calendarId: cal.id } }] });
    // 기본으로 매일 알림이 켜져 있다. 권한을 거부하면 알림을 끈다.
    const granted = await ensureNotificationPermission();
    if (!granted) updateCalendar(cal.id, { reminder: null });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior="padding" style={styles.body}>
        <View style={styles.logo}>
          <Txt weight="extrabold" style={{ fontSize: 64, color: colors.o }}>
            O
          </Txt>
          <Txt weight="extrabold" style={{ fontSize: 64, color: colors.x }}>
            X
          </Txt>
        </View>
        <View style={{ gap: 6, alignItems: 'center' }}>
          <Txt weight="extrabold" style={{ fontSize: 24 }}>
            무엇을 기록할까요?
          </Txt>
          <Txt style={{ color: colors.muted, textAlign: 'center' }}>했으면 O, 안 했으면 X. 나중에 더 추가할 수 있어요.</Txt>
        </View>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={NAME_MAX_LENGTH}
          placeholder="예: 운동"
          placeholderTextColor={colors.faint}
          style={[styles.input, { borderColor: trimmed ? colors.o : colors.line, color: colors.ink, backgroundColor: colors.surface, fontFamily: fonts.medium }]}
          returnKeyType="done"
          onSubmitEditing={start}
        />
        <View style={styles.chips}>
          {SUGGESTIONS.map((s) => {
            const on = trimmed === s;
            return (
              <Tap key={s} onPress={() => setName(s)} style={[styles.chip, { backgroundColor: on ? colors.ink : colors.cell }]}>
                <Txt weight="medium" style={{ fontSize: 14, color: on ? colors.inverseText : colors.muted }}>
                  {s}
                </Txt>
              </Tap>
            );
          })}
        </View>
        <Button title="시작하기" onPress={start} disabled={!trimmed} style={{ marginTop: 16 }} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 20 },
  logo: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
});
