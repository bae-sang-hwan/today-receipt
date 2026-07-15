import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

import { FlatList } from 'react-native-gesture-handler';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { Text } from "../components/Text";
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { DateTimeFormatter, LocalDate } from "@js-joda/core";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDate } from "../context/DateContext";
import { useNavigation } from "@react-navigation/native";
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { useFamily } from "../context/FamilyContext";

import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import {colors} from "../theme/colors";

LocaleConfig.locales['fr'] = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: "오늘"
};
LocaleConfig.defaultLocale = 'fr';

const emotionColors: { [key: string]: string } = {
  happy: colors.purple,
  regret: colors.red,
};

const adUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-5927873314061819/2518464072';

const HomeScreen = () => {

  const navigation = useNavigation<any>();

  const { selectedDate, setSelectedDate } = useDate();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});

  const userId = auth().currentUser?.uid;
  const { familyMemberIds, family } = useFamily();

  const getKoreanDateString = (date: LocalDate) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const month = date.monthValue();
    const day = date.dayOfMonth();
    const dayOfWeek = days[date.dayOfWeek().value() % 7];

    return `${month}월 ${day}일 (${dayOfWeek})`;
  };

  const onGestureEvent = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.END) {
      const { translationX } = nativeEvent;

      if (translationX < -50) {
        setSelectedDate(selectedDate.plusDays(1));
      } else if (translationX > 50) {
        setSelectedDate(selectedDate.minusDays(1));
      }
    }
  };

  useEffect(() => {
    if (!userId || familyMemberIds.length === 0) {
      setReceipts([]);
      setMarkedDates({});
      return;
    }

    const unsubscribe = firestore()
      .collection("receipts")
      .where("userId", "in", familyMemberIds.slice(0, 30)) // Firestore in 쿼리 최대 30개
      .orderBy("createdAt", "desc")
      .onSnapshot((querySnapshot) => {
        if (!querySnapshot) return;
        const marks: any = {};
        const allData: any[] = [];

        querySnapshot.forEach((doc) => {
          const data: any = { id: doc.id, ...doc.data() };
          allData.push(data);

          const dateStr = data.dateString;
          const amountNum = parseInt(data.amount?.toString().replace(/,/g, '') || '0');

          if (!marks[dateStr]) marks[dateStr] = { totalAmount: 0 };
          marks[dateStr].totalAmount += amountNum;
        });

        setReceipts(allData);
        setMarkedDates(marks);
      }, (error) => {
        console.error("Firestore 리스너 에러:", error);
      });

    return () => unsubscribe();
  }, [userId, JSON.stringify(familyMemberIds)]);

  const filteredList = receipts.filter(item => item.dateString === selectedDate.toString());

  const selectedDayTotal = useMemo(() => {
    return filteredList.reduce((sum, item) => {
      const amountNum = parseInt(item.amount.toString().replace(/,/g, '')) || 0;
      return sum + amountNum;
    }, 0);
  }, [filteredList]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 캘린더 영역 */}
      <Calendar
        style={styles.calendar}
        theme={{
          calendarBackground: colors.white,
          textSectionTitleColor: colors.placeHolder,
          textSectionTitleDisabledColor: colors.placeHolder,
          todayTextColor: colors.purple,
        }}
        enableSwipeMonths={true}
        onDayPress={day => {
          const selectedDate = LocalDate.parse(day.dateString, DateTimeFormatter.ISO_LOCAL_DATE);
          setSelectedDate(selectedDate);
        }}

        renderArrow={(direction) => (
          <View style={styles.arrowButtonContainer}>
            {direction === 'left' ? (
              <Svg width="16" height="16" viewBox="0 0 24 24" fill={colors.o40}>
                <Path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </Svg>
            ) : (
              <Svg width="16" height="16" viewBox="0 0 24 24" fill={colors.o40}>
                <Path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </Svg>
            )}
          </View>
        )}

        dayComponent={({ date, state }: any) => {
          const dateStr = date.dateString;
          const dayData = markedDates[dateStr];
          const isSelected = selectedDate.toString() === dateStr;

          const dayOfWeek = LocalDate.parse(dateStr).dayOfWeek().value();
          const isSaturday = dayOfWeek === 6;
          const isSunday = dayOfWeek === 7;

          return (
            <TouchableOpacity
              style={[styles.dayContainer, isSelected && styles.selectedDay]}
              onPress={() => {
                const newDate = LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE);
                setSelectedDate(newDate);
              }}
            >
              <Text style={[
                styles.dayText,
                state === 'disabled'
                  ? { color: colors.placeHolder }
                  : isSunday
                    ? { color: colors.red }
                    : isSaturday
                      ? { color: colors.o40 }
                      : { color: colors.black },

                isSelected && { color: colors.white, fontWeight: '600' }
              ]}>
                {date.day}
              </Text>

              {dayData && dayData.totalAmount > 0 && (
                isSelected ? (
                  <Text style={[styles.amountDayText, { color: colors.white }]} numberOfLines={1}>
                    {dayData.totalAmount >= 10000
                      ? `${Math.floor(dayData.totalAmount / 1000) / 10}만`
                      : dayData.totalAmount.toLocaleString()}
                  </Text>
                ) : (
                  <View style={styles.recordDot} />
                )
              )}
            </TouchableOpacity>
          );
        }}
        renderHeader={(date) => {
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          return <Text style={styles.headerDateText}>{year}년 {month}월</Text>;
        }}
      />

      {/*광고영역*/}
      <View style={styles.calendarAdContainer}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdFailedToLoad={(error) => console.error(error)}
        />
      </View>

      {/* 하단 상세 내역 피드 영역 */}
      <PanGestureHandler onHandlerStateChange={onGestureEvent}>
        <View style={styles.detailsContainer}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listTitle}>{getKoreanDateString(selectedDate)}</Text>
            {selectedDayTotal > 0 && (
              <Text style={styles.dayTotalText}>
                이날은 <Text style={styles.totalAmountHighlight}>{selectedDayTotal.toLocaleString()}</Text>원 썼어요
              </Text>
            )}
          </View>

          <FlatList
            data={filteredList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 16 }} // 광고 마진을 위해 살짝 패딩 가다듬기
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Text style={styles.emptyIcon}>💸</Text>
                </View>
                <Text style={styles.emptyText}>
                  아직 등록된 영수증이 없어요.{"\n"}오늘 소비한 내역을 기록해 보세요!
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Detail', { item })}
              >
                <Image source={{ uri: item.photoURL }} style={styles.cardImage} />
                <View style={styles.cardContent}>
                  {family && family.memberIds.length > 1 && item.userId !== userId && (
                    <Text style={styles.memberTag}>
                      {family.members?.[item.userId]?.displayName || '가족 구성원'}
                    </Text>
                  )}
                  <View style={styles.cardHeader}>
                    <Text style={[styles.emotionText, { color: emotionColors[item.emotion] || colors.placeHolder }]}>
                      {item.emotion === 'happy' ? '잘 샀다' : '후회'}
                    </Text>
                    <Text style={styles.amountText}>{Number(item.amount).toLocaleString()}원</Text>
                  </View>
                  <Text style={styles.memoText} numberOfLines={1}>
                    {item.memo || "작성된 메모가 없어요."}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </PanGestureHandler>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  calendar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.white,
  },
  calendarAdContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    backgroundColor: 'transparent',
  },
  headerDateText: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.black,
    letterSpacing: -0.5,
  },
  arrowButtonContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayContainer: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  selectedDay: {
    backgroundColor: colors.purple,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  amountDayText: {
    fontSize: 8,
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 2,
  },
  recordDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    backgroundColor: colors.purple,
    borderRadius: 2,
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: colors.purple10,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black
  },
  dayTotalText: {
    fontSize: 14,
    color: colors.o40,
    fontWeight: '500',
  },
  totalAmountHighlight: {
    color: colors.purple,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: .5
  },
  cardImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.white
  },
  cardContent: {
    flex: 1,
    marginLeft: 16
  },
  memberTag: {
    fontSize: 11,
    color: colors.green50,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  emotionText: {
    fontSize: 14,
    fontWeight: '700'
  },
  amountText: {
    fontSize: 15,
    fontWeight: "bold",
    color: colors.black
  },
  memoText: {
    fontSize: 13,
    color: colors.o40,
    lineHeight: 18
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.o5,
    borderStyle: 'dashed',
    marginTop: 0,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.o5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIcon: {
    fontSize: 26,
  },
  emptyText: {
    color: colors.placeHolder,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },

  // ⭐️ 추가: 배너 광고를 깔끔하게 정돈하는 고정 컨테이너 스타일 세팅
  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 8,
    backgroundColor: 'transparent',
  }
});

export default HomeScreen;