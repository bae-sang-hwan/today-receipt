import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button, Tap, Txt, Mark } from './ui';
import { useTheme, fonts } from '../theme';
import { getRecord, saveRecord, type Calendar, type MarkValue } from '../db/repo';
import { formatLongDate } from '../domain/date';
import { MEMO_MAX_LENGTH } from '../config';

// S03 날짜 기록: 날짜를 누르면 가운데에 뜬다. O나 X를 고르고 적용을 눌러야 저장한다.
// 고른 것을 한 번 더 누르면 선택이 풀려 빈칸이 된다. 바깥이나 취소를 누르면 저장하지 않는다.
export const DayModal = ({ calendar, date, onClose }: { calendar: Calendar; date: string | null; onClose: () => void }) => {
  const { colors } = useTheme();
  const [value, setValue] = useState<MarkValue>('');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (!date) return;
    const rec = getRecord(calendar.id, date);
    setValue(rec?.value ?? '');
    setMemo(rec?.memo ?? '');
  }, [date, calendar.id]);

  const apply = () => {
    if (date) saveRecord(calendar.id, date, value, memo.trim());
    onClose();
  };

  return (
    <Modal visible={!!date} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.center}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} onPress={onClose} accessibilityLabel="닫기" />
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Txt weight="extrabold" style={{ fontSize: 18, textAlign: 'center' }}>
            {date ? formatLongDate(date) : ''}
          </Txt>
          <View style={styles.choices}>
            {(['O', 'X'] as const).map((v) => {
              const on = value === v;
              const tint = v === 'O' ? colors.o : colors.x;
              return (
                <Tap
                  key={v}
                  hapticStyle="mark"
                  onPress={() => setValue(on ? '' : v)}
                  style={[styles.choice, { borderColor: on ? tint : colors.line, backgroundColor: on ? (v === 'O' ? colors.oSoft : colors.xSoft) : colors.cell }]}
                  accessibilityLabel={v}
                  accessibilityState={{ selected: on }}
                >
                  <Mark value={v} markStyle={calendar.markStyle} size={44} />
                </Tap>
              );
            })}
          </View>
          <TextInput
            value={memo}
            onChangeText={setMemo}
            maxLength={MEMO_MAX_LENGTH}
            placeholder="메모 (선택)"
            placeholderTextColor={colors.faint}
            style={[styles.input, { borderColor: colors.line, color: colors.ink, backgroundColor: colors.bg, fontFamily: fonts.regular }]}
            returnKeyType="done"
          />
          <View style={styles.footer}>
            <Button title="취소" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button title="적용" onPress={apply} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  card: { borderRadius: 22, paddingHorizontal: 20, paddingVertical: 22, gap: 16 },
  choices: { flexDirection: 'row', gap: 12 },
  choice: { flex: 1, aspectRatio: 1, borderWidth: 2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  footer: { flexDirection: 'row', gap: 8 },
});
