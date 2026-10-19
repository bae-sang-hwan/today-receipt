import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Tap, Txt, Mark } from './ui';
import { useTheme, fonts } from '../theme';
import { getRecord, saveRecord, type Calendar, type MarkValue } from '../db/repo';
import { importPhoto } from '../db/photos';
import { ensureLocalPhoto } from '../services/sync';
import { pickPhoto } from '../services/photoPicker';
import { formatLongDate } from '../domain/date';
import { MEMO_MAX_LENGTH } from '../config';

// 저장된 사진 id를 화면에 보여줄 파일 경로로 바꾼다. 기기에 없으면 서버에서 받아온다.
const usePhotoUri = (id: string) => {
  const [state, setState] = useState<{ id: string; uri: string | null; loading: boolean }>({ id: '', uri: null, loading: false });
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setState({ id, uri: null, loading: true });
    ensureLocalPhoto(id).then((uri) => alive && setState({ id, uri, loading: false }));
    return () => {
      alive = false;
    };
  }, [id]);
  return state.id === id ? state : { id, uri: null, loading: !!id };
};

// S03 날짜 기록: 날짜를 누르면 가운데에 뜬다. O나 X를 고르고 적용을 눌러야 저장한다.
// 고른 것을 한 번 더 누르면 선택이 풀려 빈칸이 된다. 바깥이나 취소를 누르면 저장하지 않는다.
// 사진은 선택 사항이다. 새로 고른 사진은 적용을 눌러야 기록 사진 폴더로 옮겨진다.
export const DayModal = ({ calendar, date, onClose }: { calendar: Calendar; date: string | null; onClose: () => void }) => {
  const { colors } = useTheme();
  const [value, setValue] = useState<MarkValue>('');
  const [memo, setMemo] = useState('');
  const [photoId, setPhotoId] = useState(''); // 저장되어 있던 사진, 지우면 ''
  const [pickedUri, setPickedUri] = useState<string | null>(null); // 새로 고른 사진(임시 파일)
  const [picking, setPicking] = useState(false);
  const [viewing, setViewing] = useState(false);
  const saved = usePhotoUri(pickedUri ? '' : photoId);
  const photoUri = pickedUri ?? saved.uri;
  const hasPhoto = !!pickedUri || !!photoId;

  useEffect(() => {
    if (!date) return;
    const rec = getRecord(calendar.id, date);
    setValue(rec?.value ?? '');
    setMemo(rec?.memo ?? '');
    setPhotoId(rec?.photo ?? '');
    setPickedUri(null);
    setViewing(false);
  }, [date, calendar.id]);

  const choosePhoto = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const uri = await pickPhoto();
      if (uri) setPickedUri(uri);
    } catch (e) {
      console.warn('사진 고르기 실패:', e);
    } finally {
      setPicking(false);
    }
  };

  const removePhoto = () => {
    setPickedUri(null);
    setPhotoId('');
  };

  const apply = () => {
    if (date) {
      let photo = photoId;
      if (pickedUri) {
        try {
          photo = importPhoto(pickedUri);
        } catch (e) {
          console.warn('사진 저장 실패:', e);
        }
      }
      saveRecord(calendar.id, date, value, memo.trim(), photo);
    }
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
          {hasPhoto ? (
            <View>
              <Tap
                onPress={() => photoUri && setViewing(true)}
                pressedOpacity={0.85}
                accessibilityLabel="사진 크게 보기"
                style={[styles.photo, { backgroundColor: colors.cell }]}
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : saved.loading ? (
                  <ActivityIndicator color={colors.muted} />
                ) : (
                  <Txt style={{ color: colors.muted, fontSize: 13 }}>사진을 불러오지 못했어요</Txt>
                )}
              </Tap>
              <View style={styles.photoActions}>
                <Tap onPress={choosePhoto} hitSlop={6} accessibilityLabel="사진 바꾸기" style={[styles.photoAction, { backgroundColor: colors.scrim }]}>
                  <Ionicons name="swap-horizontal" size={16} color="#FFFFFF" />
                </Tap>
                <Tap onPress={removePhoto} hitSlop={6} accessibilityLabel="사진 지우기" style={[styles.photoAction, { backgroundColor: colors.scrim }]}>
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </Tap>
              </View>
            </View>
          ) : (
            <Tap
              onPress={choosePhoto}
              disabled={picking}
              accessibilityLabel="사진 추가"
              style={[styles.addPhoto, { borderColor: colors.line, backgroundColor: colors.bg }]}
            >
              {picking ? <ActivityIndicator size="small" color={colors.muted} /> : <Ionicons name="image-outline" size={18} color={colors.muted} />}
              <Txt style={{ color: colors.faint, fontSize: 15 }}>사진 추가 (선택)</Txt>
            </Tap>
          )}
          <View style={styles.footer}>
            <Button title="취소" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button title="적용" onPress={apply} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
      <Modal visible={viewing} transparent animationType="fade" onRequestClose={() => setViewing(false)} statusBarTranslucent navigationBarTranslucent>
        <Pressable style={styles.viewer} onPress={() => setViewing(false)} accessibilityLabel="사진 닫기">
          {photoUri ? <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  card: { borderRadius: 22, paddingHorizontal: 20, paddingVertical: 22, gap: 16 },
  choices: { flexDirection: 'row', gap: 12 },
  choice: { flex: 1, aspectRatio: 1, borderWidth: 2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  addPhoto: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, borderStyle: 'dashed', paddingHorizontal: 14, paddingVertical: 12 },
  photo: { height: 150, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photoActions: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 6 },
  photoAction: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  viewer: { flex: 1, backgroundColor: '#000000' },
  footer: { flexDirection: 'row', gap: 8 },
});
