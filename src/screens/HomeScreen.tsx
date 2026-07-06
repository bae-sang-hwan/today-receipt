import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

import { FlatList } from 'react-native-gesture-handler';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, Dimensions, Image, TouchableOpacity } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { DateTimeFormatter, LocalDate } from "@js-joda/core";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDate } from "../context/DateContext";
import { useNavigation } from "@react-navigation/native";
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

LocaleConfig.locales['fr'] = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: "오늘"
};
LocaleConfig.defaultLocale = 'fr';

const emotionColors: { [key: string]: string } = {
  happy: '#b39ddb',
  regret: '#f5a6a6',
};

const HomeScreen = () => {
  const navigation = useNavigation<any>();

  const { selectedDate, setSelectedDate } = useDate();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});

  const userId = auth().currentUser?.uid;

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
    if (!userId) {
      setReceipts([]);
      setMarkedDates({});
      return;
    }

    const unsubscribe = firestore()
      .collection("receipts")
      .where("userId", "==", userId)
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

          if (!marks[dateStr]) {
            marks[dateStr] = { totalAmount: 0 };
          }
          marks[dateStr].totalAmount += amountNum;
        });

        setReceipts(allData);
        setMarkedDates(marks);
      }, (error) => {
        console.error("Firestore 리스너 에러:", error);
      });

    return () => unsubscribe();
  }, [userId, selectedDate]);

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
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#a0aec0',
          textSectionTitleDisabledColor: '#e2e8f0',
          todayTextColor: '#b39ddb',
        }}
        enableSwipeMonths={true}
        onDayPress={day => {
          const selectedDate = LocalDate.parse(day.dateString, DateTimeFormatter.ISO_LOCAL_DATE);
          setSelectedDate(selectedDate);
        }}

        // 2. HTML 내비게이션 버튼과 매칭되는 깔끔한 커스텀 화살표 렌더링 추가
        renderArrow={(direction) => (
          <View style={styles.arrowButtonContainer}>
            {direction === 'left' ? (
              // HTML 이전달 화살표 (<) 형태 적용
              <Svg width="16" height="16" viewBox="0 0 24 24" fill="#a0aec0">
                <Path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </Svg>
            ) : (
              // HTML 다음달 화살표 (>) 형태 적용
              <Svg width="16" height="16" viewBox="0 0 24 24" fill="#a0aec0">
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
                  ? { color: '#e2e8f0' }
                  : isSunday
                    ? { color: '#e53e3e' }
                    : isSaturday
                      ? { color: '#3182ce' }
                      : { color: '#4a5568' },

                isSelected && { color: '#ffffff', fontWeight: '600' }
              ]}>
                {date.day}
              </Text>

              {dayData && dayData.totalAmount > 0 && (
                isSelected ? (
                  <Text style={[styles.amountDayText, { color: '#ffffff' }]} numberOfLines={1}>
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
            contentContainerStyle={{ paddingBottom: 30 }}
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
                  <View style={styles.cardHeader}>
                    <Text style={[styles.emotionText, { color: emotionColors[item.emotion] || '#4a5568' }]}>
                      {item.emotion === 'happy' ? '🛍️ 잘 샀다' : '🫠 후회'}
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
    backgroundColor: '#ffffff',
  },
  calendar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  headerDateText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#2d3748',
    letterSpacing: -0.5,
  },

  // 3. HTML 동그라미 화살표 컨테이너 디자인 미러링 (.nav-btn 대응)
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
    backgroundColor: '#b39ddb',
    shadowColor: '#b39ddb',
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
    backgroundColor: '#a5d6a7',
    borderRadius: 2,
  },

  detailsContainer: {
    flex: 1,
    backgroundColor: '#f8f9fc',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 24,
    shadowColor: '#000',
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
    fontWeight: '700',
    color: '#2d3748'
  },
  dayTotalText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  totalAmountHighlight: {
    color: '#b39ddb',
    fontWeight: '700',
  },

  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: .5
  },
  cardImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#edf2f7'
  },
  cardContent: {
    flex: 1,
    marginLeft: 16
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
    fontWeight: '700',
    color: '#2d3748'
  },
  memoText: {
    fontSize: 13,
    color: '#a0aec0',
    lineHeight: 18
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 50,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginTop: 10,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#edf2f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIcon: {
    fontSize: 26,
  },
  emptyText: {
    color: '#a0aec0',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default HomeScreen;