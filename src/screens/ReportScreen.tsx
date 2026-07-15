import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from "../components/Text";
import { Ionicons } from '@expo/vector-icons';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LocalDate, DateTimeFormatter } from "@js-joda/core";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import {colors} from "../theme/colors";
import { useFamily } from "../context/FamilyContext";

const adUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-5927873314061819/2518464072';

const REGRET_ITEMS = [
  { id: 1, name: '뜨끈한 국밥', price: 10000, unit: '그릇', icon: 'restaurant-outline' as any, message: '더 먹을 수 있었어요!' },
  { id: 2, name: '아메리카노', price: 4500, unit: '잔', icon: 'cafe-outline' as any, message: '더 마실 수 있었어요!' },
  { id: 3, name: '황금올리브 치킨', price: 23000, unit: '마리', icon: 'fast-food-outline' as any, message: '더 먹을 수 있었어요!' },
  { id: 4, name: '택시 기본요금', price: 4800, unit: '번', icon: 'car-outline' as any, message: '더 탈 수 있었어요!' },
  { id: 5, name: '넷플릭스 구독', price: 17000, unit: '개월', icon: 'play-circle-outline' as any, message: '더 볼 수 있었어요!' },
  { id: 6, name: '무지 반팔티', price: 15000, unit: '개', icon: 'shirt-outline' as any, message: '더 살 수 있었어요!' },
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
    const subscriber = auth().onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return subscriber;
  }, []);

  const userId = currentUser?.uid;
  const { familyMemberIds, family } = useFamily();

  const changeMonth = (amount: number) => {
    setIsUpdating(true);
    setSelectedDate(prev => prev.plusMonths(amount));
  };

  const onHandleMonth = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.END) {
      const { translationX } = nativeEvent;
      const swipeThreshold = 50;

      if (translationX > swipeThreshold) {
        changeMonth(-1);
      } else if (translationX < -swipeThreshold) {
        changeMonth(1);
      }
    }
  };

  useEffect(() => {
    if (!userId || familyMemberIds.length === 0) {
      setReceipts([]);
      setLastMonthTotal(0);
      setIsInitialLoading(false);
      return;
    }

    setIsUpdating(true);

    const startStr = selectedDate.withDayOfMonth(1).toString();
    const endStr = selectedDate.withDayOfMonth(selectedDate.lengthOfMonth()).toString();

    const lastMonth = selectedDate.minusMonths(1);
    const lastStartStr = lastMonth.withDayOfMonth(1).toString();
    const lastEndStr = lastMonth.withDayOfMonth(lastMonth.lengthOfMonth()).toString();

    const memberIds = familyMemberIds.slice(0, 30); // Firestore in 쿼리 최대 30개

    const unsubscribe = firestore()
      .collection("receipts")
      .where("userId", "in", memberIds)
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

    firestore()
      .collection("receipts")
      .where("userId", "in", memberIds)
      .where("dateString", ">=", lastStartStr)
      .where("dateString", "<=", lastEndStr)
      .orderBy("createdAt", "desc")
      .get()
      .then(querySnapshot => {
        const total = querySnapshot.docs.reduce((sum, doc) => sum + Number(doc.data().amount || 0), 0);
        setLastMonthTotal(total);
      });

    return () => unsubscribe();
  }, [selectedDate, userId, JSON.stringify(familyMemberIds)]);

  const stats = useMemo(() => {
    const regretTotal = receipts
      .filter(item => item.emotion === 'regret')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const happyTotal = receipts
      .filter(item => item.emotion === 'happy')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const total = regretTotal + happyTotal;
    const diff = total - lastMonthTotal;
    const isIncreased = diff > 0;
    const isDecreased = diff < 0;
    const isSame = diff === 0;

    const topReceipt = receipts.length > 0
      ? [...receipts].sort((a, b) => Number(b.amount) - Number(a.amount))[0]
      : null;

    let praiseMessage = "이번 달 소비를 기록 중이에요! ✨";
    const happyRatio = total > 0 ? (happyTotal / total) * 100 : 0;

    if (total > 0) {
      if (happyRatio >= 70) praiseMessage = "와우! 가치 있는 소비를 아주 잘하고 계시네요!";
      else if (happyRatio >= 50) praiseMessage = "잘 산 지출이 50% 이상이네요! 나쁘지 않아요!";
      else praiseMessage = "후회되는 지출이 많아요. 다음 달엔 더 신중해져 볼까요?";
    }

    return {
      regretTotal,
      happyTotal,
      total,
      topReceipt,
      praiseMessage,
      happyRatio,
      diffAmount: Math.abs(diff),
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 상단 미니멀 헤더 내비게이션 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={colors.o40} />
        </TouchableOpacity>

        <View style={styles.monthNavigator}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
            <Svg width="16" height="16" viewBox="0 0 24 24" fill={colors.o40}>
              <Path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </Svg>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {selectedDate.format(DateTimeFormatter.ofPattern('yyyy년 MM월'))}
          </Text>

          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
            <Svg width="16" height="16" viewBox="0 0 24 24" fill={colors.o40}>
              <Path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </Svg>
          </TouchableOpacity>
        </View>

        <View style={{ width: 32 }} />
      </View>

      {/* ⭐️ [추가] 상단 헤더 바로 밑에 고정되는 100% 반응형 띠 배너 광고 영역 */}
      <View style={styles.topAdContainer}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdFailedToLoad={(error) => {
            console.error('리포트 상단 광고 로드 실패: ', error);
          }}
        />
      </View>

      <PanGestureHandler
        onHandlerStateChange={onHandleMonth}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-5, 5]}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            style={{ opacity: isUpdating ? 0.6 : 1 }}
          >
            {/* 최고 지출 카드 */}
            {stats.topReceipt && (
              <View style={styles.highlightCard}>
                <View style={styles.highlightBadge}>
                  <Text style={styles.highlightBadgeText}>이달의 최고지출</Text>
                </View>
                <View style={styles.highlightContent}>
                  <Image source={{ uri: stats.topReceipt.photoURL }} style={styles.highlightImage} />
                  <View style={styles.highlightInfo}>
                    {family && family.memberIds.length > 1 && stats.topReceipt.userId !== userId && (
                      <Text style={{ fontSize: 11, color: colors.green50, fontWeight: '700', marginBottom: 2 }}>
                        {family.members?.[stats.topReceipt.userId]?.displayName || '가족 구성원'}
                      </Text>
                    )}
                    <Text style={styles.highlightAmount}>{Number(stats.topReceipt.amount).toLocaleString()}원</Text>
                    <Text style={styles.highlightMemo} numberOfLines={1}>
                      {stats.topReceipt.memo || "기록된 메모가 없어요."}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* 총 지출 요약 및 진행 바 카드 */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View>
                  <Text style={styles.cardSubTitle}>{selectedDate.monthValue()}월 총 지출</Text>
                  <Text style={styles.cardMainAmount}>{stats.total.toLocaleString()}원</Text>
                </View>
              </View>

              <Text style={styles.comparisonText}>
                {stats.isSame ? (
                  "저번 달과 똑같이 썼어요! ⚖️"
                ) : (
                  <>
                    저번 달보다{' '}
                    <Text style={{ color: stats.isIncreased ? colors.red : colors.green50, fontWeight: '700' }}>
                      {stats.diffAmount.toLocaleString()}원 {stats.isIncreased ? '더' : '덜'}
                    </Text>{' '}
                    썼어요 {stats.isIncreased ? '📈' : '📉'}
                  </>
                )}
              </Text>

              <View style={styles.emotionGrid}>
                <View style={styles.emotionItem}>
                  <Text style={styles.emotionLabel}>잘 샀다</Text>
                  <Text style={styles.emotionValue}>{stats.happyTotal.toLocaleString()}원</Text>
                </View>

                <View style={styles.verticalDivider} />

                <View style={styles.emotionItem}>
                  <Text style={styles.emotionLabel}>후회</Text>
                  <Text style={styles.emotionValue}>{stats.regretTotal.toLocaleString()}원</Text>
                </View>
              </View>

              <View style={styles.praiseBox}>
                <Text style={styles.praiseText}>{stats.praiseMessage}</Text>
              </View>
            </View>

            {/* 영수증 모양을 빼고 초깔끔 플랫 카드로 변경된 리포트 */}
            <View style={styles.reportCard}>
              {stats.regretTotal > 0 && randomItem ? (
                <View style={styles.reportContent}>
                  <Text style={styles.reportMainText}>
                    이번 달 후회되는 <Text style={styles.regretHighlight}>{stats.regretTotal.toLocaleString()}원</Text>을 절약했다면,
                  </Text>

                  {/* 심플한 가로 정렬 품목 강조 스퀘어 */}
                  <View style={styles.itemMatchBox}>
                    <Ionicons name={randomItem.icon} size={24} color={colors.o40} style={{ marginRight: 8 }} />
                    <Text style={styles.itemMatchText}>
                      {randomItem.name} <Text style={styles.itemCountText}>{randomItem.count}</Text> {randomItem.unit}
                    </Text>
                  </View>

                  <Text style={styles.reportSubText}>{randomItem.message}</Text>

                  <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshItem} activeOpacity={0.7}>
                    <Ionicons name="refresh-outline" size={14} style={{ marginRight: 4 }} />
                    <Text style={styles.refreshButtonText}>다른 품목 비교</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // 완벽한 소비 중일 때 나타나는 심플 메세지 뷰
                <View style={styles.perfectContent}>
                  <View style={styles.feedbackIconBox}>
                    <Text style={styles.feedbackIcon}>👏</Text>
                  </View>
                  <Text style={styles.perfectText}>이번 달은 후회 없는 갓벽한 소비 중이에요!</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </PanGestureHandler>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.purple10
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.o5,
  },
  // ⭐️ 추가: 상단 광고 레이아웃 전용 스타일
  topAdContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // 👈 배경을 투명하게 설정
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.black,
    letterSpacing: -0.5,
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    // 💡 상단에 광고 배너가 새로 들어왔으니 첫 카드와의 상단 여백을 24 -> 16으로 살짝 조절
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  // 상단 최고 지출 요약형 카드
  highlightCard: {
    backgroundColor: colors.purple10,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.o5,
  },
  highlightBadge: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  highlightBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.black
  },
  highlightContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  highlightImage: {
    width: 54,
    height: 54,
    borderRadius: 8,
    backgroundColor: colors.white
  },
  highlightInfo: {
    marginLeft: 12,
    flex: 1
  },
  familyMemberTag: {
    fontSize: 11,
    color: colors.green50,
    fontWeight: '700',
    marginBottom: 2,
  },
  highlightAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.black
  },
  highlightMemo: {
    fontSize: 13,
    color: colors.o40,
    marginTop: 3
  },

  // 메인 지출 대시보드 카드
  summaryCard: {
    backgroundColor: colors.white,
    marginBottom: 16,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 12
  },
  cardSubTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 2,
  },
  cardMainAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.black,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.purple10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonText: {
    fontSize: 13,
    color: colors.placeHolder,
    marginTop: 2,
    fontWeight: '500',
    paddingHorizontal: 12
  },
  praiseBox: {
    marginTop: 14,
    borderRadius: 12
  },
  praiseText: {
    fontSize: 12,
    color: colors.placeHolder,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.o5,
    marginVertical: 20
  },
  emotionGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12
  },
  emotionItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.purple10,
    paddingVertical: 12,
    borderRadius: 12
  },
  emotionLabel: {
    fontSize: 12,
    color: colors.o40,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emotionValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.black
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.o5,
  },

  // 심플 플랫 형태로 변경된 하단 리포트 카드 디자인
  reportCard: {
    borderRadius: 12,
    borderTopWidth: 1,
    borderColor: colors.o5,
    paddingTop: 24,
    paddingLeft: 12,
    paddingRight: 12
  },
  reportContent: {
    alignItems: 'flex-start',
  },
  reportMainText: {
    fontSize: 14,
    color: colors.o40,
    lineHeight: 20,
  },
  regretHighlight: {
    color: colors.red,
    fontWeight: '700',
  },

  itemMatchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.purple10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    marginVertical: 12,
  },
  itemMatchText: {
    fontSize: 14,
    color: colors.black,
    fontWeight: '600',
  },
  itemCountText: {
    color: colors.purple,
    fontWeight: '700',
    verticalAlign: 'top'
  },
  reportSubText: {
    fontSize: 14,
    color: colors.o40,
    fontWeight: '500',
    marginBottom: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.o5,
    marginTop: 4,
  },
  refreshButtonText: {
    fontWeight: '600',
    fontSize: 12
  },

  perfectContent: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  feedbackIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.purple10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  feedbackIcon: {
    fontSize: 20,
  },
  perfectText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.placeHolder,
    textAlign: 'center',
  },
});

export default ReportScreen;