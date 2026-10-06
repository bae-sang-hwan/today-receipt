import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button, Sheet, Tap, Txt, Mark } from './ui';
import { useTheme, fonts } from '../theme';
import { getRecord, saveRecord, type Calendar, type MarkValue } from '../db/repo';
import { formatLongDate } from '../domain/date';
import { MEMO_MAX_LENGTH } from '../config';

// S03 날짜 상세: 날짜를 길게 누르면 올라온다. 바깥을 눌러 닫으면 저장하지 않는다.
export const DaySheet = ({ calendar, date, onClose }: { calendar: Calendar; date: string | null; onClose: () => void }) => {
  const { colors } = useTheme();
  const [value, setValue] = useState<MarkValue>('');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (!date) return;
    const rec = getRecord(calendar.id, date);
    setValue(rec?.value ?? '');
    setMemo(rec?.memo ?? '');
  }, [date, calendar.id]);

  const options: { v: MarkValue; label?: string }[] = [{ v: 'O' }, { v: 'X' }, { v: '', label: '지우기' }];

  return (
    <Sheet visible={!!date} onClose={onClose}>
      <Txt weight="extrabold" style={{ fontSize: 18 }}>
        {date ? formatLongDate(date) : ''}
      </Txt>
      <View style={styles.seg}>
        {options.map((o) => {
          const on = value === o.v;
          const tint = o.v === 'O' ? colors.o : o.v === 'X' ? colors.x : colors.ink;
          const soft = o.v === 'O' ? colors.oSoft : o.v === 'X' ? colors.xSoft : colors.cell;
          return (
            <Tap
              key={o.label ?? o.v}
              hapticStyle="mark"
              onPress={() => setValue(o.v)}
              style={[styles.segItem, { borderColor: on ? tint : colors.line, backgroundColor: on ? soft : 'transparent' }]}
              accessibilityState={{ selected: on }}
            >
              {o.label ? (
                <Txt weight="medium" style={{ color: colors.muted }}>
                  {o.label}
                </Txt>
              ) : (
                <Mark value={o.v} markStyle={calendar.markStyle} size={22} />
              )}
            </Tap>
          );
        })}
      </View>
      <View>
        <Txt style={{ fontSize: 13, color: colors.muted, marginBottom: 6 }}>메모 (선택)</Txt>
        <TextInput
          value={memo}
          onChangeText={setMemo}
          maxLength={MEMO_MAX_LENGTH}
          placeholder="예: 한강 5km 달리기"
          placeholderTextColor={colors.faint}
          style={[styles.input, { borderColor: colors.line, color: colors.ink, backgroundColor: colors.bg, fontFamily: fonts.regular }]}
          returnKeyType="done"
        />
      </View>
      <Button
        title="저장"
        onPress={() => {
          if (date) saveRecord(calendar.id, date, value, memo.trim());
          onClose();
        }}
      />
    </Sheet>
  );
};

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', gap: 8 },
  segItem: { flex: 1, height: 52, borderWidth: 1.5, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
});
