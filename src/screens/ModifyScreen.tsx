import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Modal,
  Animated,
  KeyboardAvoidingView
} from 'react-native';
import { Text } from "../components/Text";
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from '@react-native-community/datetimepicker';
import { ActivityIndicator } from 'react-native';
import { DateTimeFormatter, LocalDate, nativeJs } from "@js-joda/core";
import { useNavigation } from "@react-navigation/native";

// 파스텔 톤앤매너 매칭 룩업 테이블
const emotionColors: { [key: string]: { bg: string; text: string; border: string } } = {
  happy: { bg: '#f1eefc', text: '#6200ee', border: '#6200ee' },   // 잘 샀다: 소프트 라벤더
  regret: { bg: '#fff1f1', text: '#e74c3c', border: '#e74c3c' },  // 후회: 소프트 코랄 파스텔
};

const ModifyScreen = ({ route }: any) => {
  const { item } = route.params;

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [isSheetVisible, setIsSheetVisible] = useState(false);

  const [image, setImage] = useState<string | null>(item.photoURL);
  const [amount, setAmount] = useState(item.amount.toLocaleString());
  const [emotion, setEmotion] = useState<'happy' | 'neutral' | 'regret' | null>(item.emotion);
  const [loading, setLoading] = useState(false);
  const [memo, setMemo] = useState(item.memo || '');

  const [modifyDate, setModifyDate] = useState<LocalDate>(LocalDate.parse(item.dateString));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatAmount = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const alertDisabled = () => {
    Alert.alert('수정 불가', '한번 선택한 감정은 수정할 수 없습니다.');
    return;
  };

  const onChangeDate = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      const newDate = LocalDate.from(nativeJs(date));
      setModifyDate(newDate);
    }
  };

  const pickImage = () => {
    setIsSheetVisible(true);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const openLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleModify = async () => {
    if (!image || !amount || !emotion) {
      Alert.alert("알림", "사진, 금액, 감정을 모두 입력해주세요!");
      return;
    }

    setLoading(true);

    try {
      let finalPhotoURL = item.photoURL;

      if (image !== item.photoURL) {
        if (image.startsWith('file://') || image.startsWith('content://')) {
          try {
            await storage().refFromURL(item.photoURL).delete();
          } catch (deleteError) {
            console.warn("기존 이미지 삭제 실패:", deleteError);
          }

          const filename = image.substring(image.lastIndexOf('/') + 1);
          const storageRef = storage().ref(`receipts/${item.userId}/${LocalDate.now()}_${filename}`);
          await storageRef.putFile(image);
          finalPhotoURL = await storageRef.getDownloadURL();
        }
      }

      await firestore().collection("receipts").doc(item.id).update({
        amount: parseInt(amount.replace(/,/g, '')),
        emotion: emotion,
        memo: memo,
        photoURL: finalPhotoURL,
        updatedAt: firestore.FieldValue.serverTimestamp(),
        dateString: modifyDate.toString()
      });

      Alert.alert("성공", "영수증 기록이 수정되었습니다!", [
        { text: "확인", onPress: () => navigation.popToTop() }
      ]);

    } catch (error) {
      console.error("수정 에러:", error);
      Alert.alert("에러", "수정 중 문제가 발생했습니다.");
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
          : { backgroundColor: '#f8f9fc', borderColor: '#edf2f7', borderWidth: 1, opacity: 0.4 } // 선택 안 된 비활성 감정은 은은하게 반투명 처리
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
        {/* 상단 정갈한 미니멀 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#718096" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>기록 수정하기</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>
            영수증 / 지출 사진<Text style={styles.required}>*</Text>
          </Text>

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
                    <Ionicons name="camera-outline" size={28} color="#6200ee" />
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
            <Ionicons name="calendar-outline" size={18} color="#6200ee" style={{ marginRight: 10 }} />
            <Text style={styles.dateText}>
              {modifyDate.format(DateTimeFormatter.ofPattern('yyyy년 MM월 dd일'))}
            </Text>
            <View style={styles.miniChangeBadge}>
              <Text style={styles.miniChangeBadgeText}>변경</Text>
            </View>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={new Date(modifyDate.toString())}
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
                           onPress={alertDisabled} />
            <View style={{ width: 12 }} />
            <EmotionButton type="regret"
                           label="😭 후회 "
                           selected={emotion === 'regret'}
                           onPress={alertDisabled} />
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

          <TouchableOpacity
            style={[styles.saveButton, loading && { backgroundColor: '#e2e8f0' }]}
            onPress={handleModify}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>수정 완료</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 바텀 모달 시트 리디자인 */}
      <Modal visible={isSheetVisible} transparent={true} animationType="slide" onRequestClose={() => setIsSheetVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setIsSheetVisible(false)} />
          <View style={[styles.sheetContainer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>사진 가져오기</Text>

            <TouchableOpacity style={styles.sheetButton} onPress={() => { setIsSheetVisible(false); setTimeout(() => openCamera(), 300); }}>
              <View style={[styles.sheetIconBox, { backgroundColor: '#f1eefc' }]}>
                <Ionicons name="camera" size={20} color="#6200ee" />
              </View>
              <Text style={styles.sheetButtonText}>직접 촬영하기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetButton} onPress={() => { setIsSheetVisible(false); setTimeout(() => openLibrary(), 300); }}>
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
    color: '#e74c3c',
    marginLeft: 3,
  },
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
    shadowColor: '#6200ee',
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
  saveButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 40,
    alignItems: 'center',
    shadowColor: '#6200ee',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 32, 44, 0.4)',
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

export default ModifyScreen;