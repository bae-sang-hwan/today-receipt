import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Button, Card, ConfirmSheet, Header, Mark, Row, Tap, Toggle, Txt } from '../components/ui';
import { useTheme, fonts, CALENDAR_COLORS } from '../theme';
import { haptic } from '../haptics';
import { countRecords, createCalendar, deleteCalendar, getCalendar, updateCalendar, type MarkStyle } from '../db/repo';
import { DEFAULT_REMINDER, NAME_MAX_LENGTH } from '../config';
import { formatReminder } from '../domain/date';
import { ensureNotificationPermission, hasNotificationPermission } from '../services/reminders';
import type { ScreenProps } from '../navigation';

// S05 캘린더 추가/편집
export default function CalendarEditScreen({ navigation, route }: ScreenProps<'CalendarEdit'>) {
  const { colors } = useTheme();
  const id = route.params?.id;
  const [initial] = useState(() => (id ? getCalendar(id) : null));
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? CALENDAR_COLORS[0]);
  const [markStyle, setMarkStyle] = useState<MarkStyle>(initial?.markStyle ?? 'ox');
  const [reminder, setReminder] = useState<string | null>(initial ? initial.reminder : DEFAULT_REMINDER);
  const [lastReminder, setLastReminder] = useState(initial?.reminder ?? DEFAULT_REMINDER);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const trimmed = name.trim();

  const saving = useRef(false);

  // 알림이 켜진 캘린더인데 시스템에서 알림 권한이 꺼져 있으면 바로 알려준다.
  useEffect(() => {
    if (!initial?.reminder) return;
    hasNotificationPermission().then((granted) => setPermissionDenied(!granted));
  }, [initial]);

  const save = async () => {
    if (!trimmed || saving.current) return;
    saving.current = true;
    // 새 캘린더는 알림이 기본으로 켜져 있어 토글을 거치지 않으므로 저장할 때 권한을 묻는다. 거부하면 알림을 끈다.
    let nextReminder = reminder;
    if (nextReminder && !(await ensureNotificationPermission())) nextReminder = null;
    if (initial) updateCalendar(initial.id, { name: trimmed, color, markStyle, reminder: nextReminder });
    else createCalendar({ name: trimmed, color, markStyle, reminder: nextReminder });
    haptic.success();
    navigation.goBack();
  };

  const toggleReminder = async (on: boolean) => {
    if (!on) {
      setReminder(null);
      return;
    }
    const granted = await ensureNotificationPermission();
    setPermissionDenied(!granted);
    if (granted) setReminder(lastReminder);
  };

  const pickTime = () => {
    const [h, m] = (reminder ?? lastReminder).split(':').map(Number);
    const value = new Date();
    value.setHours(h, m, 0, 0);
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: false,
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        haptic.tap();
        const next = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        setReminder(next);
        setLastReminder(next);
      },
    });
  };

  const styleOptions: { value: MarkStyle; label: string }[] = [
    { value: 'ox', label: '기본' },
    { value: 'check', label: '체크' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <Header
        title={initial ? '캘린더 편집' : '새 캘린더'}
        onBack={navigation.goBack}
        right={
          <Tap onPress={save} disabled={!trimmed} hitSlop={10} style={{ opacity: trimmed ? 1 : 0.35 }}>
            <Txt weight="bold" style={{ color: colors.o, fontSize: 16 }}>
              저장
            </Txt>
          </Tap>
        }
      />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View>
          <Txt style={[styles.label, { color: colors.muted }]}>이름</Txt>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={NAME_MAX_LENGTH}
            placeholder="예: 운동"
            placeholderTextColor={colors.faint}
            autoFocus={!initial}
            style={[styles.input, { borderColor: colors.line, color: colors.ink, backgroundColor: colors.surface, fontFamily: fonts.medium }]}
          />
        </View>

        <View>
          <Txt style={[styles.label, { color: colors.muted }]}>색상</Txt>
          <View style={styles.swatches}>
            {CALENDAR_COLORS.map((c) => (
              <Tap
                key={c}
                onPress={() => setColor(c)}
                accessibilityLabel={`색상 ${c}`}
                accessibilityState={{ selected: c === color }}
                style={[styles.swatchRing, { borderColor: c === color ? colors.ink : 'transparent' }]}
              >
                <View style={[styles.swatch, { backgroundColor: c }]} />
              </Tap>
            ))}
          </View>
        </View>

        <View>
          <Txt style={[styles.label, { color: colors.muted }]}>표시 모양</Txt>
          <View style={styles.styles}>
            {styleOptions.map((o) => {
              const on = o.value === markStyle;
              return (
                <Tap
                  key={o.value}
                  onPress={() => setMarkStyle(o.value)}
                  accessibilityState={{ selected: on }}
                  style={[styles.styleItem, { borderColor: on ? colors.o : colors.line, backgroundColor: colors.surface }]}
                >
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Mark value="O" markStyle={o.value} size={22} />
                    <Mark value="X" markStyle={o.value} size={22} />
                  </View>
                  <Txt style={{ fontSize: 13, color: colors.muted }}>{o.label}</Txt>
                </Tap>
              );
            })}
          </View>
        </View>

        <Card>
          <Row
            title="매일 알림"
            sub={reminder ? `${formatReminder(reminder)} · 오늘 빈칸일 때만` : '꺼짐'}
            last={!reminder}
            right={<Toggle value={!!reminder} onChange={toggleReminder} />}
          />
          {reminder ? <Row title="알림 시각" value={formatReminder(reminder)} onPress={pickTime} last /> : null}
        </Card>
        {permissionDenied ? (
          <Txt style={{ color: colors.x, fontSize: 13 }}>알림 권한이 꺼져 있어요. 휴대폰 설정 &gt; 앱 &gt; 하루 OX 캘린더에서 알림을 허용해 주세요.</Txt>
        ) : null}

        {initial ? <Button title="캘린더 삭제" variant="danger" onPress={() => setConfirmDelete(true)} style={{ marginTop: 12 }} /> : null}
      </ScrollView>

      {initial ? (
        <ConfirmSheet
          visible={confirmDelete}
          title={`'${initial.name}' 캘린더를 삭제할까요?`}
          message={`기록 ${countRecords(initial.id)}개가 함께 지워지고, 되돌릴 수 없어요.`}
          confirmText="삭제"
          danger
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            haptic.warning();
            setConfirmDelete(false);
            deleteCalendar(initial.id);
            navigation.goBack();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 22, paddingBottom: 40 },
  label: { fontSize: 13, marginBottom: 8 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  swatchRing: { padding: 3, borderRadius: 22, borderWidth: 2 },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  styles: { flexDirection: 'row', gap: 10 },
  styleItem: { flex: 1, borderWidth: 1.5, borderRadius: 12, alignItems: 'center', paddingVertical: 12, gap: 4 },
});
