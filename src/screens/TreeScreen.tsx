import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { DateTimeFormatter, LocalDate } from '@js-joda/core';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';
import { useFamily } from '../context/FamilyContext';
import { GrowthTree } from '../components/GrowthTree';
import { HillBackground } from '../components/HillBackground';
import { SkyBackground } from '../components/SkyBackground';
import { CloudLayer } from '../components/CloudLayer';
import { triggerNavHaptic } from '../utils/haptics';
import { STAGE_LABELS, STAGE_THRESHOLDS, STAGE_COLORS, stageForTotal } from '../constants/tree';

const TreeScreen = () => {
  const [selectedMonth, setSelectedMonth] = useState(LocalDate.now());
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = auth().currentUser?.uid;
  const { familyMemberIds } = useFamily();

  const changeMonth = (amount: number) => {
    triggerNavHaptic();
    setLoading(true);
    setSelectedMonth((prev) => prev.plusMonths(amount));
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
      setLoading(false);
      return;
    }

    const startStr = selectedMonth.withDayOfMonth(1).toString();
    const endStr = selectedMonth.withDayOfMonth(selectedMonth.lengthOfMonth()).toString();
    const memberIds = familyMemberIds.slice(0, 30); // Firestore in 쿼리 최대 30개

    const unsubscribe = firestore()
      .collection('receipts')
      .where('userId', 'in', memberIds)
      .where('dateString', '>=', startStr)
      .where('dateString', '<=', endStr)
      .orderBy('createdAt', 'desc')
      .onSnapshot((querySnapshot) => {
        if (!querySnapshot) return;
        setReceipts(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, (error) => {
        console.error('나무 화면 리스너 에러:', error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [selectedMonth, userId, JSON.stringify(familyMemberIds)]);

  const happy = receipts.filter((item) => item.emotion === 'happy').length;
  const regret = receipts.filter((item) => item.emotion === 'regret').length;
  const total = happy + regret;
  const stage = stageForTotal(total);
  const isMaxStage = stage === STAGE_LABELS.length - 1;
  const nextThreshold = STAGE_THRESHOLDS[stage + 1];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SkyBackground />
      <CloudLayer />

      <View style={styles.monthNavigator}>
        <TouchableArrow direction="left" onPress={() => changeMonth(-1)} />
        <Text style={styles.monthText}>
          {selectedMonth.format(DateTimeFormatter.ofPattern('yyyy년 MM월'))}
        </Text>
        <TouchableArrow direction="right" onPress={() => changeMonth(1)} />
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressCount}>
            {isMaxStage ? `${total}개` : `${total} / ${nextThreshold}`}
          </Text>
        </View>
        <View style={styles.progressSegments}>
          {STAGE_LABELS.map((_, i) => (
            <View
              key={i}
              style={[styles.progressSegment, i <= stage && { backgroundColor: STAGE_COLORS[i] }]}
            />
          ))}
        </View>
        <View style={styles.progressLabels}>
          {STAGE_LABELS.map((label, i) => (
            <Text
              key={i}
              style={[styles.progressSegmentLabel, i === stage && styles.progressSegmentLabelActive]}
              numberOfLines={1}
            >
              {label}
            </Text>
          ))}
        </View>
      </View>

      <PanGestureHandler onHandlerStateChange={onHandleMonth} activeOffsetX={[-10, 10]} failOffsetY={[-8, 8]}>
        <View style={{ flex: 1 }}>
          <View style={styles.stageArea}>
            <View style={styles.hill}>
              <HillBackground />
            </View>
            {loading ? (
              <ActivityIndicator size="large" color={colors.purple} style={StyleSheet.absoluteFillObject} />
            ) : (
              <View style={styles.treeCenter}>
                <GrowthTree happy={happy} regret={regret} />
              </View>
            )}
          </View>
        </View>
      </PanGestureHandler>
    </SafeAreaView>
  );
};

const TouchableArrow = ({ direction, onPress }: { direction: 'left' | 'right'; onPress: () => void }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.arrowBtn} activeOpacity={0.7}>
      <Svg width="16" height="16" viewBox="0 0 24 24" fill={colors.o40}>
        {direction === 'left' ? (
          <Path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        ) : (
          <Path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        )}
      </Svg>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.black,
  },
  progressWrap: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  progressCount: {
    fontSize: 12,
    color: colors.o40,
  },
  progressSegments: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.o5,
  },
  progressSegment: {
    flex: 1,
    height: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    marginTop: 4,
  },
  progressSegmentLabel: {
    flex: 1,
    fontSize: 10,
    textAlign: 'center',
    color: colors.o40,
  },
  progressSegmentLabelActive: {
    fontWeight: 'bold',
    color: colors.black,
  },
  stageArea: {
    flex: 1,
    position: 'relative',
  },
  treeCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 70,
  },
  hill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 210,
  },
});

export default TreeScreen;
