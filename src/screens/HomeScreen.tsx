import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

import { FlatList } from 'react-native-gesture-handler';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, View, Text, Dimensions, Image, TouchableOpacity} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import {DateTimeFormatter, LocalDate} from "@js-joda/core";
import { SafeAreaView } from 'react-native-safe-area-context';
import {useDate} from "../context/DateContext";
import {useNavigation} from "@react-navigation/native";
import { PanGestureHandler, State } from 'react-native-gesture-handler';

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
  happy: '#6200ee',
  regret: '#e74c3c',
};

const HomeScreen = () => {

  const navigation = useNavigation<any>();

  const { selectedDate, setSelectedDate } = useDate();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});

  // 1. 현재 사용자의 UID를 상수로 추출합니다.
  const userId = auth().currentUser?.uid;

  const getKoreanDateString = (date: LocalDate) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const month = date.monthValue();
    const day = date.dayOfMonth();
    const dayOfWeek = days[date.dayOfWeek().value() % 7];

    return `${month}월 ${day}일(${dayOfWeek})`;
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
    // 2. userId가 없으면 실행하지 않습니다 (로그아웃 직후 등)
    if (!userId) {
      setReceipts([]); // 데이터 초기화
      setMarkedDates({});
      return;
    }

    console.log(`구독 시작: ${userId} 사용자의 데이터를 감시합니다.`);

    const unsubscribe = firestore()
      .collection("receipts")
      .where("userId", "==", userId) // 🔴 고정된 UID 사용
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

    // 3. 의존성 배열에 userId를 추가합니다.
    // 이제 사용자가 바뀌면 이전 구독을 해제하고 새 유저로 다시 구독합니다.
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
      <Calendar
        style={styles.calendar}
        enableSwipeMonths={true}
        onDayPress={day => {
          const selectedDate = LocalDate.parse(day.dateString, DateTimeFormatter.ISO_LOCAL_DATE);
          setSelectedDate(selectedDate);
        }}
        dayComponent={({ date, state }: any) => {
          const dateStr = date.dateString;
          const dayData = markedDates[dateStr];
          const isSelected = selectedDate.toString() === dateStr;
          const isToday = state === 'today';

          // 1. 해당 날짜의 요일 확인 (1: 월, ..., 6: 토, 7: 일)
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
                // 기본 색상 설정
                state === 'disabled'
                  ? { color: '#dbe0e0' }
                  : isToday
                    ? { color: '#6200ee', fontWeight: 'bold' }
                    : { color: '#2d4150' },

                // 2. 주말 색상 덮어쓰기 (선택되지 않았을 때만 적용)
                !isSelected && state !== 'disabled' && isSaturday && { color: '#3498db' }, // 토요일 파란색
                !isSelected && state !== 'disabled' && isSunday && { color: '#e74c3c' },   // 일요일 빨간색

                // 선택되었을 때는 하얀색 유지
                isSelected && { color: '#fff' }
              ]}>
                {date.day}
              </Text>

              {dayData && dayData.totalAmount > 0 && (
                <Text
                  style={[styles.amountDayText, isSelected && { color: '#fff' }]}
                  numberOfLines={1}
                >
                  {dayData.totalAmount >= 10000
                    ? `${Math.floor(dayData.totalAmount / 1000) / 10}만`
                    : dayData.totalAmount.toLocaleString()}
                </Text>
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

      <PanGestureHandler onHandlerStateChange={onGestureEvent}>
        <View style={styles.listContainer}>
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
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>이날은 기록이 없어요. 💸</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Detail', { item })}
              >
                <Image source={{ uri: item.photoURL }} style={styles.cardImage} />
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.emotionText, { color: emotionColors[item.emotion] }]}>
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
    backgroundColor: '#fff',
  },
  dayContainer: {
    width: '100%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  selectedDay: {
    backgroundColor: '#6200ee',
  },
  dayText: {
    fontSize: 14,
    marginBottom: 2,
  },
  amountDayText: {
    fontSize: 8,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
    marginTop: 10
  },
  headerDateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    color: '#888',
  },
  infoBox: { padding: 20, borderTopWidth: 1, borderColor: '#eee' },
  infoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },

  listContainer: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  dayTotalText: {
    fontSize: 14,
    color: '#636e72',
    fontWeight: '500',
  },
  totalAmountHighlight: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, padding: 12, marginBottom: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardImage: { width: 70, height: 70, borderRadius: 10, backgroundColor: '#eee' },
  cardContent: { flex: 1, marginLeft: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  emotionText: { fontSize: 14, fontWeight: 'bold' },
  amountText: { fontSize: 15, fontWeight: 'bold', color: '#2d3436' },
  memoText: { fontSize: 14, color: '#636e72', lineHeight: 20 },
  emptyBox: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#b2bec3', fontSize: 14 },
});

export default HomeScreen;