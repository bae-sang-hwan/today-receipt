import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, Platform } from 'react-native';
import { StyleSheet, View, Image, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from "../components/Text";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { DateTimeFormatter, LocalDate } from "@js-joda/core";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 전체 앱과 톤앤매너를 맞춘 소프트 파스텔 컬러 룩업
const emotionColors: { [key: string]: { bg: string; text: string } } = {
  happy: { bg: '#f1eefc', text: '#6200ee' },   // 잘 샀다: 소프트 라벤더
  regret: { bg: '#fff1f1', text: '#e74c3c' },  // 후회: 소프트 코랄 파스텔
};

const stampImages: { [key: string]: any } = {
  happy: require('../../assets/stamp_happy.png'),
  regret: require('../../assets/stamp_regret.png'),
};

const DetailScreen = ({ route, navigation }: any) => {
  const { item } = route.params;
  const insets = useSafeAreaInsets();

  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const stampImage = stampImages[item.emotion] || stampImages.happy;

  const translateY = useRef(new Animated.Value(300)).current;

  const getKoreanDateString = (date: LocalDate) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const month = date.monthValue();
    const day = date.dayOfMonth();
    const dayOfWeek = days[date.dayOfWeek().value() % 7];

    return `${month}월 ${day}일(${dayOfWeek})`;
  };

  useEffect(() => {
    if (isSheetVisible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isSheetVisible]);

  const handleEditPress = () => {
    setIsSheetVisible(false);
    navigation.navigate('Modify', { item: item });
  };

  const handleDeletePress = () => {
    setIsSheetVisible(false);

    Alert.alert(
      "기록 삭제",
      "이 영수증 기록을 정말 삭제하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => deleteReceipt()
        },
      ]
    );
  };

  const deleteReceipt = async () => {
    try {
      await firestore().collection("receipts").doc(item.id).delete();
      Alert.alert("삭제 완료", "기록이 성공적으로 삭제되었습니다.");
      navigation.goBack();
    } catch (error) {
      console.error("삭제 중 오류:", error);
      Alert.alert("오류", "삭제에 실패했습니다.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 상단 미니멀 네비게이션 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#718096" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>지출 상세</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => setIsSheetVisible(true)}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#718096" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* 라운드 처리가 들어간 감각적인 이미지 프레임 카드 */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.photoURL }} style={styles.image} resizeMode="cover" />

          {/* 감정 도장 이미지 배치 */}
          <Image
            source={stampImage}
            style={styles.stampImage}
            resizeMode="contain"
          />
        </View>

        {/* 세련되게 정돈된 정보 레이아웃 컨텐츠 */}
        <View style={styles.content}>
          <Text style={styles.dateText}>
            {getKoreanDateString(LocalDate.parse(item.dateString, DateTimeFormatter.ISO_LOCAL_DATE))}
          </Text>

          <View style={styles.row}>
            <View style={[styles.emotionBadge, { backgroundColor: emotionColors[item.emotion]?.bg || '#f8f9fc' }]}>
              <Text style={[styles.emotionBadgeText, { color: emotionColors[item.emotion]?.text || '#718096' }]}>
                {item.emotion === 'happy' ? '🛍️ 잘 샀다 ' : '😭 후회 '}
              </Text>
            </View>
            <Text style={styles.amountText}>{Number(item.amount).toLocaleString()}원</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>메모</Text>
          <View style={styles.memoBox}>
            <Text style={styles.memoText}>
              {item.memo || "작성된 메모가 없습니다."}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* 바텀 다이얼로그 모달 리디자인 */}
      <Modal
        visible={isSheetVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => setIsSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsSheetVisible(false)}
          />

          <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }], paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>기록 관리</Text>

            <TouchableOpacity
              style={styles.sheetButton}
              onPress={handleEditPress}
              activeOpacity={0.6}
            >
              <View style={[styles.sheetIconBox, { backgroundColor: '#faf8ff' }]}>
                <Ionicons name="pencil" size={18} color="#6200ee" />
              </View>
              <Text style={styles.sheetButtonText}>수정하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetButton}
              onPress={handleDeletePress}
              activeOpacity={0.6}
            >
              <View style={[styles.sheetIconBox, { backgroundColor: '#fff1f1' }]}>
                <Ionicons name="trash" size={18} color="#e74c3c" />
              </View>
              <Text style={[styles.sheetButtonText, { color: '#e74c3c' }]}>삭제하기</Text>
            </TouchableOpacity>
          </Animated.View>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  headerButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
    letterSpacing: -0.5,
  },
  scrollContent: {
    padding: 24,
  },
  imageContainer: {
    width: '100%',
    height: 340,
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#f8f9fc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%'
  },
  stampImage: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 140,
    height: 140,
    transform: [{ rotate: '-15deg' }]
  },
  content: {
    paddingTop: 24,
    paddingHorizontal: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#a0aec0',
    fontWeight: '600',
    marginBottom: 12
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  emotionBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  emotionBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  amountText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2d3748',
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#edf2f7',
    marginVertical: 24
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 12
  },
  memoBox: {
    backgroundColor: '#f8f9fc',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  memoText: {
    fontSize: 15,
    color: '#4a5568',
    lineHeight: 22,
    fontWeight: '500',
  },

  // 일관성 있게 구성된 바텀 시트 디자인
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 20,
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

export default DetailScreen;