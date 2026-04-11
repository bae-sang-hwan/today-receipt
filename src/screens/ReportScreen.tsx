import React, {useMemo, useState, useEffect, useCallback} from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useNavigation} from "@react-navigation/native";
import {SafeAreaView} from "react-native-safe-area-context";
import { LocalDate, DateTimeFormatter } from "@js-joda/core"
import {PanGestureHandler, State} from "react-native-gesture-handler";
import { Image } from 'react-native';

const { width } = Dimensions.get('window');

const REGRET_ITEMS = [
  { id: 1, name: '🍱 뜨끈한 국밥', price: 10000, unit: '그릇', icon: 'restaurant-outline', message: '더 먹을 수 있었어요!' },
  { id: 2, name: '☕️ 아메리카노', price: 4500, unit: '잔', icon: 'cafe-outline', message: '더 마실 수 있었어요!' },
  { id: 3, name: '🍗 황금올리브 치킨', price: 23000, unit: '마리', icon: 'fast-food-outline', message: '더 먹을 수 있었어요!' },
  { id: 4, name: '🚕 택시 기본요금', price: 4800, unit: '번', icon: 'car-outline', message: '더 탈 수 있었어요!' },
  { id: 5, name: '🎬 넷플릭스 구독', price: 17000, unit: '개월', icon: 'play-circle-outline', message: '더 볼 수 있었어요!' },
  { id: 6, name: '👕 무지 반팔티', price: 15000, unit: '개', icon: 'shirt-outline', message: '더 살 수 있었어요!' },
];

const ReportScreen = () => {

  const navigation = useNavigation<any>();

  const [selectedDate, setSelectedDate] = useState(LocalDate.now());
  const [receipts, setReceipts] = useState<any[]>([]);
  const [lastMonthTotal, setLastMonthTotal] = useState(0);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [randomItem, setRandomItem] = useState<any>(null);

  const [currentUser, setCurrentUser] = useState(auth().currentUser);

  useEffect(() => {
    // 인증 상태 리스너 등록 (유저 변경 감지용)
    const subscriber = auth().onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return subscriber;
  }, []);

  const userId = currentUser?.uid;

  const changeMonth = (amount: number) => {
    setIsUpdating(true);
    setSelectedDate(prev => prev.plusMonths(amount));
  };

  const onHandleMonth = ({ nativeEvent }: any) => {
    // 제스처가 끝났을 때(END)만 실행되도록 함
    if (nativeEvent.state === State.END) {
      const { translationX } = nativeEvent;

      // 스와이프 민감도 설정 (수치가 클수록 더 많이 밀어야 바뀜)
      const swipeThreshold = 50;

      if (translationX > swipeThreshold) {
        // 오른쪽으로 밀었을 때 -> 이전 달로 이동
        changeMonth(-1);
      } else if (translationX < -swipeThreshold) {
        // 왼쪽으로 밀었을 때 -> 다음 달로 이동
        changeMonth(1);
      }
    }
  };

  useEffect(() => {
    if (!userId) {
      setReceipts([]);
      setLastMonthTotal(0);
      setIsInitialLoading(false);
      return;
    }

    setIsUpdating(true);

    // 이번 달 범위
    const startStr = selectedDate.withDayOfMonth(1).toString();
    const endStr = selectedDate.withDayOfMonth(selectedDate.lengthOfMonth()).toString();

    // 지난달 범위 계산
    const lastMonth = selectedDate.minusMonths(1);
    const lastStartStr = lastMonth.withDayOfMonth(1).toString();
    const lastEndStr = lastMonth.withDayOfMonth(lastMonth.lengthOfMonth()).toString();

    // 1. 이번 달 데이터 구독 (실시간)
    const unsubscribe = firestore()
      .collection("receipts")
      .where("userId", "==", userId)
      .where("dateString", ">=", startStr)
      .where("dateString", "<=", endStr)
      .orderBy("createdAt", "desc")
      .onSnapshot((querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReceipts(data);
        setIsInitialLoading(false);
        setIsUpdating(false);
        setRandomItem(null);
      });

    // 2. 지난달 데이터 합계 가져오기 (단발성)
    firestore()
      .collection("receipts")
      .where("userId", "==", userId)
      .where("dateString", ">=", lastStartStr)
      .where("dateString", "<=", lastEndStr)
      .orderBy("createdAt", "desc")
      .get()
      .then(querySnapshot => {
        const total = querySnapshot.docs.reduce((sum, doc) => sum + Number(doc.data().amount || 0), 0);
        setLastMonthTotal(total);
      });

    return () => unsubscribe();
  }, [selectedDate, userId]);

  const stats = useMemo(() => {

    const regretTotal = receipts
      .filter(item => item.emotion === 'regret')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const happyTotal = receipts
      .filter(item => item.emotion === 'happy')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const total = regretTotal + happyTotal;

    const diff = total - lastMonthTotal; // 이번 달 - 지난달
    const isIncreased = diff > 0;
    const isDecreased = diff < 0;
    const isSame = diff === 0;

    const topReceipt = receipts.length > 0
      ? [...receipts].sort((a, b) => Number(b.amount) - Number(a.amount))[0]
      : null;

    let praiseMessage = "이번 달 소비를 기록 중이에요! ✨";
    const happyRatio = total > 0 ? (happyTotal / total) * 100 : 0;

    if (total > 0) {
      if (happyRatio >= 70) praiseMessage = "와우! 이번달은 가치 있는 소비를 아주 잘하고 계시네요! 😍";
      else if (happyRatio >= 50) praiseMessage = "이번 달은 잘 산 지출이 50%이상이네요!\n 나쁘지 않아요! 👍";
      else praiseMessage = "이번달은 후회되는 지출이 조금 많아요.\n 다음 달엔 더 신중해져 볼까요? 🧐";
    }

    return {
      regretTotal,
      happyTotal,
      total,
      topReceipt,
      praiseMessage,
      happyRatio,
      diffAmount: Math.abs(diff), // 절댓값으로 차액 저장
      isIncreased,
      isDecreased,
      isSame
    }
  }, [receipts, lastMonthTotal]);

  const handleRefreshItem = useCallback(() => {
    if (stats.regretTotal <= 0) return;
    const selected = REGRET_ITEMS[Math.floor(Math.random() * REGRET_ITEMS.length)];
    const count = Math.floor(stats.regretTotal / selected.price);
    setRandomItem({ ...selected, count });
  }, [stats.regretTotal]);

  useEffect(() => {
    if (stats.regretTotal > 0 && !randomItem) {
      handleRefreshItem();
    }
  }, [stats.regretTotal, randomItem, handleRefreshItem]);

  if (isInitialLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.monthNavigator}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
            <Ionicons name="chevron-back" size={16} color="#000000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {selectedDate.format(DateTimeFormatter.ofPattern('yyyy년 MM월'))}
          </Text>

          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={16} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <PanGestureHandler onHandlerStateChange={onHandleMonth}
                         activeOffsetX={[-10, 10]}
                         failOffsetY={[-5, 5]}>
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            style={{ opacity: isUpdating ? 0.6 : 1 }} // 데이터 교체 중일 때 살짝 투명하게 처리
          >
          {stats.topReceipt && (
            <View style={styles.highlightCard}>
              <View style={styles.highlightBadge}>
                <Text style={styles.highlightBadgeText}>이달의 최고지출!</Text>
              </View>
              <View style={styles.highlightContent}>
                <Image source={{ uri: stats.topReceipt.photoURL }}
                       style={styles.highlightImage} />
                <View style={styles.highlightInfo}>
                  <Text style={styles.highlightAmount}>{Number(stats.topReceipt.amount).toLocaleString()}원</Text>
                  <Text style={styles.highlightMemo} numberOfLines={1}>{stats.topReceipt.memo || "기록된 메모 없음"}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.summaryCard}>
            <View style={styles.statRow}>
              <View>
                <Text style={styles.statLabel}>{selectedDate.monthValue()}월 총 지출</Text>
                <Text style={styles.statValue}>{stats.total.toLocaleString()}원</Text>

                <Text style={styles.comparisonText}>
                  {stats.isSame ? (
                    "저번 달과 똑같이 썼어요! ⚖️"
                  ) : (
                    <>
                      저번 달보다{' '}
                      <Text style={{
                        color: stats.isIncreased ? '#e74c3c' : '#2ecc71',
                        fontWeight: 'bold'
                      }}>
                        {stats.diffAmount.toLocaleString()}원 {stats.isIncreased ? '더' : '덜'}
                      </Text>{' '}
                      썼어요 {stats.isIncreased ? '📈' : '📉'}
                    </>
                  )}
                </Text>
              </View>
              <Ionicons name="receipt-outline" size={32} color="#6200ee" />
            </View>

            {/* 3. 칭찬 메시지 시스템 */}
            <View style={styles.praiseBox}>
              <Text style={styles.praiseText}>{stats.praiseMessage}</Text>
            </View>

            <View style={styles.divider} />
            <View style={styles.emotionRow}>
              <View style={styles.emotionItem}>
                <Text style={[styles.emotionLabel, { color: '#6c5ce7' }]}>🛍️ 잘 샀다</Text>
                <Text style={styles.emotionValue}>{stats.happyTotal.toLocaleString()}원</Text>
              </View>
              <View style={styles.emotionItem}>
                <Text style={[styles.emotionLabel, { color: '#e74c3c' }]}>😭 후회</Text>
                <Text style={styles.emotionValue}>{stats.regretTotal.toLocaleString()}원</Text>
              </View>
            </View>
          </View>

          <View style={styles.regretCard}>
            <View style={styles.regretReceiptHeader}>
              <View style={styles.dot} />
              <Text style={styles.regretTitle}>EMOTIONAL REPORT</Text>
              <View style={styles.dot} />
            </View>

            <Text style={styles.regretSubtitle}>이 돈이면 차라리...!</Text>

            <View style={styles.dashedLine} />
            {stats.regretTotal > 0 && randomItem ? (
              <View style={styles.regretContent}>
                <View style={styles.iconCircle}>
                  <Ionicons name={randomItem.icon} size={36} color="#e74c3c" />
                </View>
                <Text style={styles.regretMainText}>
                  후회되는 <Text style={styles.regretAmount}>{stats.regretTotal.toLocaleString()}원</Text>으로
                </Text>
                <View style={styles.resultBadge}>
                  <Text style={styles.regretResultText}>
                    {randomItem.name} <Text style={styles.highlightText}>{randomItem.count}{randomItem.unit}</Text>
                  </Text>
                </View>
                <Text style={styles.regretSubText}>{randomItem.message} 💸</Text>

                {stats.regretTotal > 0 && (
                  <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshItem}>
                    <Text style={styles.refreshButtonText}>무엇을 더 할 수 있었을까? 🔄</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.perfectContent}>
                <Ionicons name="sparkles" size={30} color="#2ecc71" style={{marginBottom: 10}} />
                <Text style={styles.perfectText}>이 기간은 후회 없는 소비 중! 👏</Text>
              </View>
            )}
            <View style={styles.dashedLine} />
            <View style={styles.zigzagContainer}>
              {[...Array(20)].map((_, i) => (
                <View key={i} style={styles.zigzagTriangle} />
              ))}
            </View>
          </View>
        </ScrollView>
        </View>
      </PanGestureHandler>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
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
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtn: {
    padding: 10,
    marginHorizontal: 5,
  },
  scrollContent: { padding: 20 },

  // 요약 카드 스타일
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  statLabel: { fontSize: 14, color: '#666' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#2d3436' },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 15 },
  emotionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  emotionItem: { flex: 1 },
  emotionLabel: { fontSize: 14, marginBottom: 4, fontWeight: '800' },
  emotionValue: { fontSize: 18, fontWeight: 'bold', color: '#2d3436' },

  regretSection: {
    backgroundColor: '#fff',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 25,
    paddingBottom: 40,
    position: 'relative',
    elevation: 2,
  },

  refreshButton: { marginTop: 20, alignItems: 'center', padding: 10 },
  refreshButtonText: { color: '#000', fontWeight: '800', fontSize: 14 },

  receiptEdge: {
    position: 'absolute',
    bottom: -10,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: '#ddd',
  },

  regretCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    paddingTop: 20,
    paddingBottom: 0,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    overflow: 'hidden'
  },
  regretReceiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ccc', marginHorizontal: 10 },
  regretTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#bbb',
    letterSpacing: 2,
  },
  regretSubtitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    color: '#333',
    marginVertical: 10,
  },
  dashedLine: {
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: '#ddd',
    marginVertical: 15,
    marginHorizontal: 15,
  },
  regretContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 5,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ffebeb',
  },
  regretMainText: {
    fontSize: 15,
    color: '#888',
    marginBottom: 10,
  },
  regretAmount: {
    color: '#e74c3c',
    fontWeight: '700',
  },
  resultBadge: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  regretResultText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  highlightText: {
    color: '#e74c3c',
    fontSize: 18,
    fontWeight: '900',
  },
  regretSubText: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: '500',
  },
  perfectContent: {
    padding: 30,
    alignItems: 'center',
  },
  perfectText: {
    color: '#2ecc71',
    fontWeight: '700',
    fontSize: 15,
  },

  // 전월 대비 텍스트
  comparisonText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  // 칭찬 박스
  praiseBox: {
    backgroundColor: '#f3ebff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  praiseText: {
    fontSize: 13,
    color: '#6200ee',
    fontWeight: '600',
    textAlign: 'center',
  },
  // 하이라이트 카드
  highlightCard: {
    backgroundColor: '#1e272e', // 다크한 느낌으로 포인트
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  highlightBadge: {
    backgroundColor: '#f1c40f',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  highlightBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#000' },
  highlightContent: { flexDirection: 'row', alignItems: 'center' },
  highlightImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#333' },
  highlightInfo: { marginLeft: 12, flex: 1 },
  highlightAmount: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  highlightMemo: { fontSize: 12, color: '#ccc', marginTop: 2 },

  // 지그재그 장식
  zigzagContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 10,
    overflow: 'hidden',
  },
  zigzagTriangle: {
    width: width / 15, // 화면 너비에 맞춰 삼각형 개수 조절
    height: width / 15,
    backgroundColor: '#f9f9f9', // 배경색과 맞춤
    transform: [{ rotate: '45deg' }],
    marginTop: 5,
    marginHorizontal: 1,
  },
});

export default ReportScreen;