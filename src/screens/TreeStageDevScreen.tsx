import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import { colors } from '../theme/colors';
import { GrowthTree } from '../components/GrowthTree';
import { HillBackground } from '../components/HillBackground';
import { SkyBackground } from '../components/SkyBackground';
import { CloudLayer } from '../components/CloudLayer';
import { STAGE_LABELS, STAGE_THRESHOLDS, stageForTotal } from '../constants/tree';
import { triggerNavHaptic } from '../utils/haptics';

const MAX_COUNT = 20;

// TreeScreen과 동일한 배경/트리 렌더링 구조를 그대로 쓰고, 실제 리시트 대신
// 행복/아쉬움 개수를 직접 조절해서 단계별 모습을 바로 확인하는 개발용 화면.
const TreeStageDevScreen = () => {
  const navigation = useNavigation<any>();
  const [happy, setHappy] = useState(0);
  const [regret, setRegret] = useState(0);

  const total = happy + regret;
  const stage = stageForTotal(total);

  const clamp = (n: number) => Math.max(0, Math.min(MAX_COUNT, n));

  const jumpToStage = (target: number) => {
    triggerNavHaptic();
    const nextTotal = STAGE_THRESHOLDS[target];
    setHappy(nextTotal);
    setRegret(0);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>나무 단계 미리보기 (DEV)</Text>
      </View>

      <View style={styles.stageArea}>
        <SkyBackground />
        <CloudLayer />
        <View style={styles.hill}>
          <HillBackground />
        </View>
        <View style={styles.treeCenter}>
          <GrowthTree happy={happy} regret={regret} />
        </View>
      </View>

      <View style={styles.controlPanel}>
        <Text style={styles.stageInfoText}>
          {stage}단계 · {STAGE_LABELS[stage]} (행복 {happy} + 아쉬움 {regret} = {total}개)
        </Text>

        <Counter
          label="행복"
          value={happy}
          onDecrement={() => setHappy((v) => clamp(v - 1))}
          onIncrement={() => setHappy((v) => clamp(v + 1))}
        />
        <Counter
          label="아쉬움"
          value={regret}
          onDecrement={() => setRegret((v) => clamp(v - 1))}
          onIncrement={() => setRegret((v) => clamp(v + 1))}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stageBtnRow}>
          {STAGE_LABELS.map((label, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.stageBtn, stage === i && styles.stageBtnActive]}
              onPress={() => jumpToStage(i)}
              activeOpacity={0.7}
            >
              <Text style={[styles.stageBtnText, stage === i && styles.stageBtnTextActive]}>{i}. {label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const Counter = ({
  label,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) => (
  <View style={styles.counterRow}>
    <Text style={styles.counterLabel}>{label}</Text>
    <View style={styles.counterControls}>
      <TouchableOpacity style={styles.counterBtn} onPress={onDecrement} activeOpacity={0.7}>
        <Text style={styles.counterBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.counterValue}>{value}</Text>
      <TouchableOpacity style={styles.counterBtn} onPress={onIncrement} activeOpacity={0.7}>
        <Text style={styles.counterBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.black,
    marginLeft: 4,
  },
  stageArea: {
    flex: 1,
    position: 'relative',
  },
  hill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 210,
  },
  treeCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 70,
  },
  controlPanel: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.o5,
    padding: 16,
    gap: 10,
  },
  stageInfoText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 2,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.placeHolder,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.purple10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.purple,
  },
  counterValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.black,
    minWidth: 24,
    textAlign: 'center',
  },
  stageBtnRow: {
    gap: 8,
    paddingTop: 4,
  },
  stageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.o5,
  },
  stageBtnActive: {
    backgroundColor: colors.purple,
  },
  stageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.placeHolder,
  },
  stageBtnTextActive: {
    color: colors.white,
  },
});

export default TreeStageDevScreen;
