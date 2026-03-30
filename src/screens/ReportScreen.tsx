import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { db, auth } from '../api/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import {useNavigation} from "@react-navigation/native";
import {SafeAreaView} from "react-native-safe-area-context";

const { width } = Dimensions.get('window');

const REGRET_ITEMS = [
  { id: 1, name: '🍱 뜨끈한 국밥', price: 10000, unit: '그릇', icon: 'restaurant-outline', message: '더 먹을 수 있었어요!' },
  { id: 2, name: '☕️ 아메리카노', price: 4500, unit: '잔', icon: 'cafe-outline', message: '더 마실 수 있었어요!' },
  { id: 3, name: '🍗 황금올리브 치킨', price: 23000, unit: '마리', icon: 'fast-food-outline', message: '더 먹을 수 있었어요!' },
  { id: 4, name: '🚕 택시 기본요금', price: 4800, unit: '번', icon: 'car-outline', message: '더 탈 수 있었어요!' },
  { id: 5, name: '🎬 넷플릭스 구독', price: 17000, unit: '개월', icon: 'play-circle-outline', message: '더 볼 수 있었어요!' },
  { id: 6, name: '👕 무지 반팔티', price: 15000, unit: '장', icon: 'shirt-outline', message: '더 살 수 있었어요!' },
];

const ReportScreen = () => {

  const navigation = useNavigation<any>();

  const [ receipts, setReceipts     ] = useState<any[]>([]);
  const [ loading, setLoading       ] = useState(true);
  const [ randomItem, setRandomItem ] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const now = new Date();
    // 🗓️ 이번 달 1일 00:00:00
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 🗓️ 다음 달 1일 00:00:00 (이 시간 '미만'으로 설정하면 이번 달 말일까지 포함됨)
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const q = query(
      collection(db, "receipts"),
      where("userId", "==", auth.currentUser.uid),
      where("createdAt", ">=", startOfMonth),
      where("createdAt", "<", startOfNextMonth),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReceipts(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore 에러:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    const regretTotal = receipts
      .filter(item => item.emotion === 'regret')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const happyTotal = receipts
      .filter(item => item.emotion === 'happy')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return { regretTotal, happyTotal };
  }, [receipts]);

  useEffect(() => {
    if (stats.regretTotal > 0 && !randomItem) {
      handleRefreshItem();
    }
  }, [stats.regretTotal]);

  const handleRefreshItem = () => {
    const selected = REGRET_ITEMS[Math.floor(Math.random() * REGRET_ITEMS.length)];
    const count = Math.floor(stats.regretTotal / selected.price);
    setRandomItem({ ...selected, count });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
        <Text style={styles.headerTitle}>소비 통계 📊</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <View style={styles.statRow}>
            <View>
              <Text style={styles.statLabel}>이번 달 총 지출</Text>
              <Text style={styles.statValue}>{(stats.happyTotal + stats.regretTotal).toLocaleString()}원</Text>
            </View>
            <Ionicons name="receipt-outline" size={32} color="#6200ee" />
          </View>

          <View style={styles.divider} />

          <View style={styles.emotionRow}>
            <View style={styles.emotionItem}>
              <Text style={[styles.emotionLabel, { color: '#6c5ce7' }]}>돈 최고 (Happy)</Text>
              <Text style={styles.emotionValue}>{stats.happyTotal.toLocaleString()}원</Text>
            </View>
            <View style={styles.emotionItem}>
              <Text style={[styles.emotionLabel, { color: '#e74c3c' }]}>녹아내린 통장 (Regret)</Text>
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
                녹아내린 <Text style={styles.regretAmount}>{stats.regretTotal.toLocaleString()}원</Text>으로
              </Text>

              <View style={styles.resultBadge}>
                <Text style={styles.regretResultText}>
                  {randomItem.name} <Text style={styles.highlightText}>{randomItem.count}{randomItem.unit}</Text>
                </Text>
              </View>

              <Text style={styles.regretSubText}>{randomItem.message} 💸</Text>
            </View>
          ) : (
            <View style={styles.perfectContent}>
              <Ionicons name="sparkles" size={30} color="#2ecc71" style={{marginBottom: 10}} />
              <Text style={styles.perfectText}>이번 달은 후회 없는 소비 중! 👏</Text>
            </View>
          )}

          <View style={styles.dashedLine} />

          {/* 영수증 하단 지그재그 장식 */}
          <View style={styles.zigzagContainer}>
            {[...Array(20)].map((_, i) => (
              <View key={i} style={styles.zigzagTriangle} />
            ))}
          </View>
        </View>

        {stats.regretTotal > 0 && (
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshItem}>
            <Text style={styles.refreshButtonText}>다른 비교 대상 보기 🔄</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  scrollContent: { padding: 20 },

  // 요약 카드 스타일
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
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
  emotionLabel: { fontSize: 12, marginBottom: 4, fontWeight: '600' },
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
  refreshButtonText: { color: '#6200ee', fontWeight: '600', fontSize: 14 },

  receiptEdge: {
    position: 'absolute',
    bottom: -10,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: '#ddd', // 배경색과 동일하게 해서 지그재그 효과 (간단 구현용)
  },

  regretCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 4, // 영수증 느낌을 위해 곡률을 줄임
    paddingTop: 20,
    paddingBottom: 0, // 지그재그를 위해 하단 패딩 제거
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
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
    fontWeight: '800',
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
    paddingBottom: 25,
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
    fontSize: 24,
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