import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "../api/firebaseConfig";

import React, { useState } from 'react';
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
  Modal, Animated
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from '@react-native-community/datetimepicker';
import { ActivityIndicator } from 'react-native';
import { DateTimeFormatter, LocalDate, nativeJs } from "@js-joda/core";
import { useNavigation } from "@react-navigation/native";

const emotionColors: { [key: string]: string } = {
  happy: '#9b59b6',
  neutral: '#bdc3c7',
  regret: '#e74c3c',
};

const ModifyScreen = ({ route }: any) => {

  const { item } = route.params;

  const navigation = useNavigation<any>();

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
  }

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

  // 1. 직접 카메라 촬영 로직 (AddScreen과 동일)
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

  // 2. 갤러리 선택 로직 (AddScreen과 동일)
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

  // 3️⃣ ✅ 수정 완료 함수 (handleSave -> handleModify)
  const handleModify = async () => {
    // 필수 입력값 체크 (AddScreen과 동일)
    if (!image || !amount || !emotion) {
      Alert.alert("알림", "사진, 금액, 감정을 모두 입력해주세요!");
      return;
    }

    setLoading(true); // 로딩 시작

    try {
      let finalPhotoURL = item.photoURL; // 기본값은 기존 이미지 URL

      // 4️⃣ ✅ 이미지가 변경되었는지 확인
      if (image !== item.photoURL) {
        // 새 이미지가 로컬 URI(file://)인 경우 업로드 진행
        if (image.startsWith('file://') || image.startsWith('content://')) {
          // A. 기존 스토리지 이미지 삭제 (용량 절약)
          try {
            const oldStorageRef = ref(storage, item.photoURL);
            await deleteObject(oldStorageRef);
          } catch (deleteError) {
            // 기존 이미지가 없거나 삭제 실패해도 프로세스는 계속 진행
            console.warn("기존 이미지 삭제 실패:", deleteError);
          }

          // B. 새 이미지 업로드 (Firebase Storage)
          const response = await fetch(image);
          const blob = await response.blob();
          const filename = image.substring(image.lastIndexOf('/') + 1);
          // 기존 userId를 사용하여 경로 유지
          const storageRef = ref(storage, `receipts/${item.userId}/${LocalDate.now()}_${filename}`);

          await uploadBytes(storageRef, blob);
          finalPhotoURL = await getDownloadURL(storageRef); // 새 URL 획득
        }
      }

      const docRef = doc(db, "receipts", item.id);
      await updateDoc(docRef, {
        amount: parseInt(amount.replace(/,/g, '')),
        emotion: emotion,
        memo: memo,
        photoURL: finalPhotoURL,
        updatedAt: serverTimestamp(),
        dateString: modifyDate.toString()
      });

      Alert.alert("성공", "영수증 기록이 수정되었습니다!", [
        {
          text: "확인",
          onPress: () => navigation.popToTop()
        }
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
      style={[styles.emotionBtn, selected && { backgroundColor: emotionColors[type] }]}
    >
      <Text style={selected ? { color: '#fff' } : { color: '#333' }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>기록 수정하기</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>
          영수증 사진<Text style={styles.required}>*</Text>
        </Text>

        <View style={styles.imageContainer}>
          {image ? (
            <View style={styles.previewWrapper}>
              <Image source={{ uri: image }} style={styles.fullImage} />
              <TouchableOpacity style={styles.closeButton} onPress={clearImage}>
                <Ionicons name="close-circle" size={30} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage}>
              <View style={styles.centerContent}>
                <Ionicons name="camera" size={40} color="#ccc" />
                <Text style={{ color: '#ccc', marginTop: 10 }}>영수증 촬영하기</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.label}>
          소비 날짜<Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateSelector}>
          <Ionicons name="calendar-outline" size={20} color="#6200ee" />
          <Text style={styles.dateText}>
            {modifyDate.format(DateTimeFormatter.ofPattern('yyyy년 MM월 dd일'))}
          </Text>
          <Text style={styles.editLink}>변경</Text>
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
        <TextInput
          style={styles.input}
          placeholder="금액을 입력하세요"
          keyboardType="numeric"
          value={amount}
          onChangeText={(text) => {
            const formatted = formatAmount(text);
            setAmount(formatted);
          }}
        />

        <Text style={styles.label}>
          이 소비에 대한 내 감정은?<Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.emotionRow}>
          <EmotionButton type="happy"
                         label="💸 돈 최고"
                         selected={emotion === 'happy'}
                         onPress={alertDisabled} />
          <EmotionButton type="regret"
                         label="🫠 녹아내린 통장"
                         selected={emotion === 'regret'}
                         onPress={alertDisabled} />
        </View>

        <Text style={styles.label}>메모 (한 줄 기록)</Text>
        <TextInput
          style={styles.memoInput}
          placeholder="어디에 쓰셨나요? (예: 편의점 간식)"
          value={memo}
          onChangeText={setMemo}
          maxLength={40}
        />

        {/* 8️⃣ ✅ 버튼 텍스트 변경 (기록하기 -> 수정 완료) */}
        <TouchableOpacity
          style={[styles.saveButton, loading && { backgroundColor: '#ccc' }]}
          onPress={handleModify} // 함수 변경
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>수정 완료</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={isSheetVisible} transparent={true} animationType="none" onRequestClose={() => setIsSheetVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setIsSheetVisible(false)} />
          <Animated.View style={styles.sheetContainer}>
            <Text style={styles.sheetTitle}>영수증 가져오기</Text>
            <TouchableOpacity style={styles.sheetButton} onPress={() => { setIsSheetVisible(false); setTimeout(() => openCamera(), 300); }}>
              <Ionicons name="camera" size={22} color="#6200ee" />
              <Text style={styles.sheetButtonText}>직접 촬영하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetButton} onPress={() => { setIsSheetVisible(false); setTimeout(() => openLibrary(), 300); }}>
              <Ionicons name="images" size={22} color="#6200ee" />
              <Text style={styles.sheetButtonText}>갤러리에서 선택</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  )
};

// AddScreen 스타일 기반, 헤더 스타일 추가
const styles = StyleSheet.create({
  // ... AddScreen의 기존 스타일들 전부 그대로 유지 ...
  container: { flex: 1, backgroundColor: '#fff' },
  // ✅ 헤더 스타일 추가
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContent: { padding: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 10, flexDirection: 'row' },
  required: { color: '#ef5350', marginLeft: 4, },
  imageContainer: { width: '100%', height: 250 },
  imagePlaceholder: { width: '100%', height: 250, backgroundColor: '#f9f9f9', borderRadius: 10, borderWidth: 1, borderColor: '#eee', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  centerContent: { alignItems: 'center' },
  previewWrapper: { width: '100%', height: '100%', position: 'relative' },
  fullImage: { width: '100%', height: '100%', borderRadius: 10 },
  closeButton: { position: 'absolute', top: -10, right: -10, backgroundColor: '#fff', borderRadius: 15, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2, },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 15, fontSize: 16 },
  emotionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  emotionBtn: { flex: 1, padding: 15, marginHorizontal: 5, borderRadius: 10, backgroundColor: '#f0f0f0', alignItems: 'center' },
  selectedBtn: { backgroundColor: '#6200ee' },
  saveButton: { backgroundColor: '#6200ee', padding: 18, borderRadius: 10, marginTop: 40, marginBottom: 0, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  dateText: { fontSize: 16, marginLeft: 10, flex: 1 },
  editLink: { color: '#6200ee', fontWeight: 'bold' },
  memoInput: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 15, fontSize: 16, backgroundColor: '#fcfcfc', },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', },
  sheetContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 15, paddingBottom: Platform.OS === 'ios' ? 40 : 30, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 20, },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 20, color: '#333', },
  sheetButton: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', },
  sheetButtonText: { fontSize: 16, marginLeft: 15, color: '#333', fontWeight: '500', },
});

export default ModifyScreen;