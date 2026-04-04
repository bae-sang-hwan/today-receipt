import React, {useEffect, useRef, useState} from 'react';
import {Alert, Animated, Modal, Platform} from 'react-native';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import {DateTimeFormatter, LocalDate} from "@js-joda/core";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const emotionColors: { [key: string]: string } = {
  happy: '#6200ee',
  regret: '#e74c3c',
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView>
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.photoURL }} style={styles.image} resizeMode="cover" />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => setIsSheetVisible(true)}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>

          <Image
            source={stampImage}
            style={styles.stampImage}
            resizeMode="contain"
          />
        </View>

        {/* 상세 정보 영역 */}
        <View style={styles.content}>
          <Text style={styles.dateText}>
            {getKoreanDateString(LocalDate.parse(item.dateString, DateTimeFormatter.ISO_LOCAL_DATE))}
          </Text>

          <View style={styles.row}>
            <Text style={[styles.emotionBadge, { backgroundColor: emotionColors[item.emotion] }]}>
              {item.emotion === 'happy' ? '🛍️ "잘 샀다' : '😭 후회'}
            </Text>
            <Text style={styles.amountText}>{Number(item.amount).toLocaleString()}원</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>메모</Text>
          <Text style={styles.memoText}>
            {item.memo || "작성된 메모가 없습니다."}
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={isSheetVisible}
        transparent={true}
        animationType="none" // 투명도 애니메이션은 꺼둠 (배경 즉시 Dim 효과)
        onRequestClose={() => setIsSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {/* 1. 배경을 누르면 닫히는 투명 영역 (Dim) */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsSheetVisible(false)}
          />

          {/* 2. 밑에서 올라오는 화이트 시트 (Animated.View) */}
          <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }], paddingBottom: insets.bottom }]}>
            <Text style={styles.sheetTitle}>기록 관리</Text>

            <TouchableOpacity
              style={styles.sheetButton}
              onPress={handleEditPress}
            >
              <Ionicons name="pencil" size={20} color="#6200ee" />
              <Text style={styles.sheetButtonText}>수정하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetButton, { borderBottomWidth: 0 }]}
              onPress={handleDeletePress}
            >
              <Ionicons name="trash" size={20} color="#ff4757" />
              <Text style={[styles.sheetButtonText]}>삭제하기</Text>
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
    backgroundColor: '#fff'
  },
  imageContainer: {
    width: '100%',
    height: 400,
    position: 'relative',
  },
  stampImage: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 150,
    height: 150,
    transform: [{ rotate : '-18deg' }]
  },
  image: { width: '100%', height: '100%' },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 8
  },
  moreButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    borderRadius: 20,
    elevation: 3,        // 안드로이드 그림자
    shadowColor: '#000', // iOS 그림자
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  content: { padding: 25 },
  dateText: { fontSize: 14, color: '#888', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emotionBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, color: '#fff', fontWeight: 'bold', overflow: 'hidden' },
  amountText: { fontSize: 24, fontWeight: 'bold', color: '#2d3436' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 25 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  memoText: { fontSize: 16, color: '#636e72', lineHeight: 24 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 15,
    width: '100%',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
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

export default DetailScreen;