import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, storage, auth } from "../api/firebaseConfig";

import React, {useCallback, useEffect, useState} from 'react';
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
import {SafeAreaView} from "react-native-safe-area-context";
import DateTimePicker from '@react-native-community/datetimepicker';
import { ActivityIndicator } from 'react-native';
import {DateTimeFormatter, LocalDate, nativeJs} from "@js-joda/core";
import {useDate} from "../context/DateContext";
import {useFocusEffect, useNavigation} from "@react-navigation/native";

const emotionColors: { [key: string]: string } = {
  happy: '#9b59b6',
  neutral: '#bdc3c7',
  regret: '#e74c3c',
};

const AddScreen = () => {

  const navigation = useNavigation<any>();

  const [ isSheetVisible, setIsSheetVisible ] = useState(false);
  const [ image, setImage     ] = useState<string | null>(null);
  const [ amount, setAmount   ] = useState('');
  const [ emotion, setEmotion ] = useState<'happy' | 'neutral' | 'regret' | null>(null);
  const [ loading, setLoading ] = useState(false);
  const [ memo, setMemo       ] = useState('');

  const { selectedDate, setSelectedDate } = useDate();

  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {

      setEmotion('happy')

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
  }

  // 숫자를 3자리마다 쉼표가 들어간 문자열로 변환
  const formatAmount = (text: string) => {
    // 숫자만 남기기
    const cleaned = text.replace(/[^0-9]/g, '');
    // 3자리마다 쉼표 추가
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const onChangeDate = (event: any, date?: Date) => {

    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      // 네이티브 Date를 다시 LocalDate로 변환하여 저장
      const newDate = LocalDate.from(nativeJs(date));
      setSelectedDate(newDate);
    }
  };

  const pickImage = () => {
    setIsSheetVisible(true);
  };

// 1. 직접 카메라 촬영 로직
  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: false, // ✅ true에서 false로 변경 (편집 단계 건너뜀)
      quality: 0.5,         // 화질은 그대로 유지 (서버 용량 절약)
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

// 2. 갤러리 선택 로직도 동일하게 수정 (선택 사항)
  const openLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false, // ✅ false로 바꾸면 앨범에서 고르자마자 바로 등록됩니다.
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {

    if (!image && !amount && !emotion) {
      Alert.alert("알림", "사진, 금액, 감정을 모두 입력해주세요!");
      return;
    }

    if (!image) {
      Alert.alert("알림", "사진을 추가해주세요!");
      return;
    }

    if (!amount) {
      Alert.alert("알림", "금액을 입력해주세요!");
      return;
    }

    if (!emotion) {
      Alert.alert("알림", "감정을 선택해주세요!");
      return;
    }

    setLoading(true); // 로딩 시작

    try {
      // 2. 이미지 업로드 (Firebase Storage)
      const response = await fetch(image);
      const blob = await response.blob(); // 이미지를 Blob 형태로 변환

      const filename = image.substring(image.lastIndexOf('/') + 1);
      const storageRef = ref(storage, `receipts/${auth.currentUser?.uid}/${LocalDate.now()}_${filename}`);

      await uploadBytes(storageRef, blob);
      const photoURL = await getDownloadURL(storageRef);

      // 3. 데이터 저장 (Firestore)
      await addDoc(collection(db, "receipts"), {
        userId: auth.currentUser?.uid,
        amount: parseInt(amount.replace(/,/g, '')), // 쉼표 제거 후 숫자로 저장
        emotion: emotion,
        memo: memo,
        photoURL: photoURL,
        createdAt: serverTimestamp(), // 서버 시간 기준
        dateString: selectedDate.toString()
      });

      Alert.alert("성공", "영수증이 기록되었습니다!", [
        {
          text: "확인",
          onPress: () => navigation.navigate('home', { screen: 'Home' })
        }
      ]);

      // 4. 입력창 초기화
      resetField();
    } catch (error) {
      console.error("저장 에러:", error);
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
        {
          text: "아니오",
          onPress: () => console.log("삭제 취소"),
          style: "cancel" // iOS에서 글자가 굵게 표시됨
        },
        {
          text: "예",
          onPress: () => setImage(null), // '예'를 눌렀을 때만 초기화
          style: "destructive" // iOS에서 글자가 빨간색으로 표시됨
        }
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>기록 등록하기</Text>
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
              {/* X 버튼 */}
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
            {selectedDate.format(DateTimeFormatter.ofPattern('yyyy년 MM월 dd일'))}
          </Text>
          <Text style={styles.editLink}>변경</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            // ✅ Picker에는 네이티브 Date 객체를 넘겨줘야 합니다.
            value={new Date(selectedDate.toString())}
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
                         onPress={() => setEmotion('happy')} />
          <EmotionButton type="regret"
                         label="🫠 녹아내린 통장"
                         selected={emotion === 'regret'}
                         onPress={() => setEmotion('regret')} />
        </View>

        <Text style={styles.label}>메모 (한 줄 기록)</Text>
        <TextInput
          style={styles.memoInput}
          placeholder="어디에 쓰셨나요? (예: 편의점 간식)"
          value={memo}
          onChangeText={setMemo}
          maxLength={40} // 한 줄 메모이므로 글자 수 제한
        />

          <TouchableOpacity
            style={[styles.saveButton, loading && { backgroundColor: '#ccc' }]}
            onPress={handleSave}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>기록하기</Text>
            )}
        </TouchableOpacity>
      </ScrollView>
      <Modal
        visible={isSheetVisible}
        transparent={true}
        animationType="none" // ✅ 전체 슬라이드 대신 '없음'으로 설정
        onRequestClose={() => setIsSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {/* 1. 배경을 누르면 닫히는 투명 영역 (Dim) */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsSheetVisible(false)}
          />

          <Animated.View style={styles.sheetContainer}>
            <Text style={styles.sheetTitle}>영수증 가져오기</Text>

            <TouchableOpacity
              style={styles.sheetButton}
              onPress={() => {
                setIsSheetVisible(false);
                setTimeout(() => openCamera(), 300);
              }}
            >
              <Ionicons name="camera" size={22} color="#6200ee" />
              <Text style={styles.sheetButtonText}>직접 촬영하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetButton}
              onPress={() => {
                setIsSheetVisible(false);
                setTimeout(() => openLibrary(), 300);
              }}
            >
              <Ionicons name="images" size={22} color="#6200ee" />
              <Text style={styles.sheetButtonText}>갤러리에서 선택</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  )
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    flexDirection: 'row'
  },
  required: {
    color: '#ef5350',
    marginLeft: 4,
  },
  imageContainer: { width: '100%', height: 250 }, // 컨테이너 크기 고정
  imagePlaceholder: {
    width: '100%', height: 250, backgroundColor: '#f9f9f9', borderRadius: 10,
    borderWidth: 1, borderColor: '#eee', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
  },
  centerContent: { alignItems: 'center' },
  previewWrapper: { width: '100%', height: '100%', position: 'relative' }, // position: relative가 중요!
  fullImage: { width: '100%', height: '100%', borderRadius: 10 },
  closeButton: {
    position: 'absolute', // 미리보기 위에 띄우기
    top: -10,             // 살짝 위로
    right: -10,           // 살짝 오른쪽으로
    backgroundColor: '#fff', // X 아이콘이 잘 보이게 배경색 추가
    borderRadius: 15,     // 동그랗게
    elevation: 5,         // 안드로이드 그림자
    shadowColor: '#000',  // iOS 그림자
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  input: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 15, fontSize: 16
  },
  emotionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  emotionBtn: {
    flex: 1, padding: 15, marginHorizontal: 5, borderRadius: 10,
    backgroundColor: '#f0f0f0', alignItems: 'center'
  },
  selectedBtn: { backgroundColor: '#6200ee' },
  saveButton: {
    backgroundColor: '#6200ee', padding: 18, borderRadius: 10,
    marginTop: 40, marginBottom: 0, alignItems: 'center'
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee'
  },
  dateText: { fontSize: 16, marginLeft: 10, flex: 1 },
  editLink: { color: '#6200ee', fontWeight: 'bold' },
  memoInput: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fcfcfc',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // ✅ 배경색은 Modal이 뜨자마자 바로 보임
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30, // iOS 하단 노치 대응
    width: '100%',
    // 그림자 추가로 입체감 부여
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#eee',
    borderRadius: 2.5,
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 20,
    color: '#333',
  },
  sheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  sheetButtonText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
    fontWeight: '500',
  },
});

export default AddScreen;