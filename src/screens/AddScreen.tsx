import firestore from '@react-native-firebase/firestore';
import { db, storage_ref, auth_ref } from '../api/firebaseConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Modal,
  Animated,
  KeyboardAvoidingView,
  PermissionsAndroid
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from '@react-native-community/datetimepicker';
import { ActivityIndicator } from 'react-native';
import { DateTimeFormatter, LocalDate, nativeJs } from "@js-joda/core";
import { useDate } from "../context/DateContext";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Svg, { Path } from 'react-native-svg';

// 변경된 세련된 감정 시그니처 파스텔 매칭 컬러 테이블
const emotionColors: { [key: string]: { bg: string; text: string; border: string } } = {
  happy: { bg: '#f1eefc', text: '#b39ddb', border: '#b39ddb' }, // 잘 샀다: 소프트 라벤더
  regret: { bg: '#fff1f1', text: '#f5a6a6', border: '#f5a6a6' }, // 후회: 소프트 코랄 파스텔
};

const AddScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [emotion, setEmotion] = useState<'happy' | 'neutral' | 'regret' | null>(null);
  const [loading, setLoading] = useState(false);
  const [memo, setMemo] = useState('');

  const { selectedDate, setSelectedDate } = useDate();
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setEmotion('happy');
      return () => {
        resetField();
      };
    }, [])
  );

  const resetField = () => {
    setImage(null);
    setAmount('');
    setEmotion(null);
    setMemo('');
  };

  const formatAmount = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const onChangeDate = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      const newDate = LocalDate.from(nativeJs(date));
      setSelectedDate(newDate);
    }
  };

  const pickImage = () => {
    setIsSheetVisible(true);
  };

  const openCamera = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "카메라 권한 요청",
            message: "영수증 사진 촬영을 위해 카메라 권한이 필요합니다.",
            buttonNeutral: "나중에",
            buttonNegative: "거부",
            buttonPositive: "허용",
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("알림", "카메라 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.");
          return;
        }
      } catch (err) {
        console.warn(err);
        return;
      }
    }

    launchCamera(
      { mediaType: 'photo', quality: 0.5 },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('에러', `카메라를 열 수 없습니다. (${response.errorMessage})`);
          return;
        }
        if (response.assets) {
          setImage(response.assets[0].uri ?? null);
        }
      }
    );
  };

  const openLibrary = async () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.5 },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('에러', '갤러리를 열 수 없습니다.');
          return;
        }
        if (response.assets) {
          setImage(response.assets[0].uri ?? null);
        }
      }
    );
  };

  const handleSave = async () => {
    if (!image || !amount || !emotion) {
      Alert.alert("알림", "모든 항목을 입력해주세요!");
      return;
    }

    setLoading(true);

    try {
      const filename = image.substring(image.lastIndexOf('/') + 1);
      const userId = auth_ref.currentUser?.uid;

      if (!userId) {
        Alert.alert("에러", "로그인이 필요합니다.");
        return;
      }

      const uploadPath = Platform.OS === 'android' ? image : image.replace('file://', '');
      const reference = storage_ref.ref(`receipts/${userId}/${Date.now()}_${filename}`);

      await reference.putFile(uploadPath);
      const photoURL = await reference.getDownloadURL();

      await db.collection("receipts").add({
        userId: userId,
        amount: parseInt(amount.replace(/,/g, '')),
        emotion: emotion,
        memo: memo,
        photoURL: photoURL,
        createdAt: firestore.FieldValue.serverTimestamp(),
        dateString: selectedDate.toString()
      });

      navigation.navigate('SaveComplete', { photoURL, emotion });
      resetField();

    } catch (error) {
      console.error("저장 에러 상세:", error);
      Alert.alert("에러", "저장 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const clearImage = () => {
    Alert.alert(
      "사진 삭제",
      "찍은 사진을 삭제하고 다시 촬영하시겠습니까?",
      [
        { text: "아니오", style: "cancel" },
        { text: "예", onPress: () => setImage(null), style: "destructive" }
      ]
    );
  };

  const EmotionButton = ({ type, label, selected, onPress }: any) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.emotionBtn,
        selected
          ? { backgroundColor: emotionColors[type].bg, borderColor: emotionColors[type].border, borderWidth: 1 }
          : { backgroundColor: '#f8f9fc', borderColor: '#edf2f7', borderWidth: 1 }
      ]}
    >
      <Text
        style={[
          styles.emotionBtnText,
          selected ? { color: emotionColors[type].text, fontWeight: '700' } : { color: '#718096' }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        {/* 상단 헤더라인 리디자인 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#718096" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>기록하기</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>
            영수증 / 지출 사진<Text style={styles.required}>*</Text>
          </Text>

          {/* 깔끔한 라운드 카드 형태의 프레임워크 */}
          <View style={styles.imageContainer}>
            {image ? (
              <View style={styles.previewWrapper}>
                <Image source={{ uri: image }} style={styles.fullImage} />
                <TouchableOpacity style={styles.closeButton} onPress={clearImage} activeOpacity={0.8}>
                  <Ionicons name="close" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage} activeOpacity={0.6}>
                <View style={styles.centerContent}>
                  <View style={styles.cameraIconBox}>
                    <Ionicons name="camera-outline" size={28} color="#b39ddb" />
                  </View>
                  <Text style={styles.placeholderText}>여기를 눌러 사진을 첨부하세요</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.label}>
            소비 날짜<Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateSelector} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={18} color="#b39ddb" style={{ marginRight: 10 }} />
            <Text style={styles.dateText}>
              {selectedDate.format(DateTimeFormatter.ofPattern('yyyy년 MM월 dd일'))}
            </Text>
            <View style={styles.miniChangeBadge}>
              <Text style={styles.miniChangeBadgeText}>변경</Text>
            </View>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={new Date(selectedDate.toString())}
              mode="date"
              onChange={onChangeDate}
            />
          )}

          <Text style={styles.label}>
            사용 금액<Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#cbd5e0"
              keyboardType="numeric"
              value={amount}
              onChangeText={(text) => {
                const formatted = formatAmount(text);
                setAmount(formatted);
              }}
            />
            <Text style={styles.inputUnit}>원</Text>
          </View>

          <Text style={styles.label}>
            이 소비에 대한 내 감정은?<Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.emotionRow}>
            <EmotionButton type="happy"
                           label="🛍️ 잘 샀다 "
                           selected={emotion === 'happy'}
                           onPress={() => setEmotion('happy')} />
            <View style={{ width: 12 }} />
            <EmotionButton type="regret"
                           label="😭 후회 "
                           selected={emotion === 'regret'}
                           onPress={() => setEmotion('regret')} />
          </View>

          <Text style={styles.label}>메모 (한 줄 기록)</Text>
          <TextInput
            style={styles.memoInput}
            placeholder="어디에 쓰셨나요? (예: 편의점 간식)"
            placeholderTextColor="#cbd5e0"
            value={memo}
            onChangeText={setMemo}
            maxLength={40}
          />

          {/* 하단 활성화 세련된 그라데이션 라벤더 저장 버튼 */}
          <TouchableOpacity
            style={[styles.saveButton, loading && { backgroundColor: '#e2e8f0' }]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>기록 완료하기</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 바텀 모달 시트 리디자인 */}
      <Modal
        visible={isSheetVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsSheetVisible(false)}
          />

          <View style={[styles.sheetContainer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>영수증 가져오기</Text>

            <TouchableOpacity
              style={styles.sheetButton}
              onPress={() => {
                setIsSheetVisible(false);
                setTimeout(() => openCamera(), 300);
              }}
            >
              <View style={[styles.sheetIconBox, { backgroundColor: '#f1eefc' }]}>
                <Ionicons name="camera" size={20} color="#b39ddb" />
              </View>
              <Text style={styles.sheetButtonText}>직접 촬영하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetButton}
              onPress={() => {
                setIsSheetVisible(false);
                setTimeout(() => openLibrary(), 300);
              }}
            >
              <View style={[styles.sheetIconBox, { backgroundColor: '#f8f9fc' }]}>
                <Ionicons name="images" size={20} color="#718096" />
              </View>
              <Text style={styles.sheetButtonText}>갤러리에서 선택</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
    letterSpacing: -0.5,
  },
  scrollContent: {
    padding: 24
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3748',
    marginTop: 24,
    marginBottom: 10,
  },
  required: {
    color: '#f5a6a6',
    marginLeft: 3,
  },

  // 이미지 플레이스홀더 파스텔 서식 고도화
  imageContainer: {
    width: '100%',
    height: 220
  },
  imagePlaceholder: {
    width: '100%',
    height: 220,
    backgroundColor: '#faf8ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1eefc',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  cameraIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#b39ddb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  placeholderText: {
    fontSize: 13,
    color: '#a0aec0',
    fontWeight: '500',
  },
  centerContent: {
    alignItems: 'center'
  },
  previewWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative'
  },
  fullImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 인풋박스 및 인라인 요소 다듬기
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edf2f7',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '600',
  },
  inputUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4a5568',
    marginLeft: 8,
  },

  // 감정 선택 버튼 배치 구조
  emotionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  emotionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emotionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // 날짜 피커 버튼 박스 스타일링
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fc',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edf2f7'
  },
  dateText: {
    fontSize: 15,
    color: '#2d3748',
    fontWeight: '600',
    flex: 1
  },
  miniChangeBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  miniChangeBadgeText: {
    color: '#718096',
    fontWeight: '600',
    fontSize: 12,
  },
  memoInput: {
    borderWidth: 1,
    borderColor: '#edf2f7',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    fontWeight: '500',
    color: '#2d3748',
    backgroundColor: '#f8f9fc',
  },

  // 저장 메인 서브밋 구조 변경
  saveButton: {
    backgroundColor: '#b39ddb', // 통일성 높은 시그니처 파스텔 라벤더
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 40,
    alignItems: 'center',
    shadowColor: '#b39ddb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },

  // 모달 영역 디자인 정돈
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 32, 44, 0.4)', // 좀 더 고급스러운 네이비 블랙 알파값 블러팅효과
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    width: '100%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    color: '#2d3748',
  },
  sheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
  },
  sheetIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  sheetButtonText: {
    fontSize: 15,
    color: '#4a5568',
    fontWeight: '600',
  },
});

export default AddScreen;