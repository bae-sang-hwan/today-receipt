import {auth, db} from "../api/firebaseConfig";
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

import React, {useEffect, useState} from 'react';
import {StyleSheet, View, Text, Dimensions, Animated, Image, TouchableOpacity} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import {DateTimeFormatter, LocalDate} from "@js-joda/core";
import { SafeAreaView } from 'react-native-safe-area-context';
import {useDate} from "../context/DateContext";
import FlatList = Animated.FlatList;
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
  happy: '#9b59b6',
  neutral: '#bdc3c7',
  regret: '#e74c3c',
};

const HomeScreen = () => {

  const navigation = useNavigation<any>();

  const { selectedDate, setSelectedDate } = useDate();
  const [ receipts, setReceipts ] = useState<any[]>([]);
  const [ markedDates, setMarkedDates ] = useState<any>({});

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
    if (!auth.currentUser) return;

    // 1. 현재 사용자의 영수증 데이터 실시간 감시
    const q = query(
      collection(db, "receipts"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const marks: any = {}; // 날짜별 합계 및 상태 저장
      const allData: any[] = [];

      querySnapshot.forEach((doc) => {
        const data: any = { id: doc.id, ...doc.data() };
        allData.push(data);

        const dateStr = data.dateString;
        const amountNum = parseInt(data.amount.toString().replace(/,/g, '')) || 0;

        if (!marks[dateStr]) {
          marks[dateStr] = { totalAmount: 0 };
        }
        marks[dateStr].totalAmount += amountNum;
      });

      setReceipts(allData);
      setMarkedDates(marks);
    });

    return () => unsubscribe();
  }, [selectedDate]);

  const filteredList = receipts.filter(item => item.dateString === selectedDate.toString());

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Calendar
        style={styles.calendar}
        // 날짜 클릭 시 실행될 함수
        onDayPress={day => {
          const selectedDate = LocalDate.parse(day.dateString, DateTimeFormatter.ISO_LOCAL_DATE);
          setSelectedDate(selectedDate);
          console.log('선택된 날짜:', day.dateString);
        }}
        dayComponent={({ date, state }: any) => {
          const dateStr = date.dateString;
          const dayData = markedDates[dateStr];
          const isSelected = selectedDate.toString() === dateStr;
          const isToday = state === 'today';

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
                state === 'disabled' ? { color: '#dbe0e0' } : isToday ? { color: '#6200ee', fontWeight: 'bold' } : { color: '#2d4150' },
                isSelected && { color: '#fff' }
              ]}>
                {date.day}
              </Text>

              {/* ✅ 지출 합계 표시 */}
              {dayData && dayData.totalAmount > 0 && (
                <Text
                  style={[styles.amountDayText, isSelected && { color: '#fff' }]}
                  numberOfLines={1}
                >
                  {/* 만원 단위 초과 시 '만'으로 표기하거나 그대로 표기 */}
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

      {/* 리스트 섹션 */}
      <PanGestureHandler onHandlerStateChange={onGestureEvent}>
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>{getKoreanDateString(selectedDate)}</Text>

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
                      {item.emotion === 'happy' ? '💸 돈 최고' : '🫠 녹아내린 통장'}
                    </Text>
                    <Text style={styles.amountText}>{Number(item.amount).toLocaleString()}원</Text>
                  </View>
                  <Text style={styles.memoText} numberOfLines={1}>
                    {item.memo || "작성된 메모가 없습니다."}
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
    height: 42, // 날짜와 금액이 들어갈 충분한 높이
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
    color: '#e74c3c', // 지출은 빨간색 계열
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

  listContainer: { flex: 1, backgroundColor: '#f8f9fa', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, marginTop: 10 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
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