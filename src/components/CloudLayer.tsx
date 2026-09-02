import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type CloudShapeKind = 'puffy' | 'round' | 'lumpy' | 'lopsided';

type CloudConfig = {
  top: number;
  width: number;
  height: number;
  opacity: number;
  duration: number;
  delay: number;
  startRatio: number; // 처음 렌더링될 때 화면 가로 위치 비율 (0~1)
  shape: CloudShapeKind;
};

const CLOUDS: CloudConfig[] = [
  { top: 100, width: 170, height: 70, opacity: 0.55, duration: 130000, delay: 0, startRatio: 0.12, shape: 'puffy' },
  { top: 185, width: 120, height: 52, opacity: 0.45, duration: 170000, delay: 8000, startRatio: 0.62, shape: 'round' },
  { top: 60, width: 135, height: 58, opacity: 0.4, duration: 150000, delay: 20000, startRatio: 0.82, shape: 'lumpy' },
  { top: 250, width: 195, height: 80, opacity: 0.5, duration: 190000, delay: 4000, startRatio: 0.35, shape: 'lopsided' },
];

// 3봉우리 + 밑판. 가장 기본적인 뭉게구름 형태.
const PuffyCloud = () => (
  <>
    <Rect x="14" y="30" width="92" height="24" rx="12" fill="#fff" />
    <Circle cx="34" cy="32" r="18" fill="#fff" />
    <Circle cx="62" cy="24" r="22" fill="#fff" />
    <Circle cx="90" cy="32" r="16" fill="#fff" />
  </>
);

// 2개의 큰 봉우리로 이루어진 통통하고 둥근 형태.
const RoundCloud = () => (
  <>
    <Rect x="10" y="28" width="76" height="26" rx="13" fill="#fff" />
    <Circle cx="32" cy="27" r="19" fill="#fff" />
    <Circle cx="64" cy="25" r="21" fill="#fff" />
  </>
);

// 작은 봉우리 4개가 이어진 울퉁불퉁한 형태.
const LumpyCloud = () => (
  <>
    <Rect x="8" y="32" width="104" height="20" rx="10" fill="#fff" />
    <Circle cx="24" cy="34" r="13" fill="#fff" />
    <Circle cx="46" cy="23" r="17" fill="#fff" />
    <Circle cx="70" cy="21" r="17" fill="#fff" />
    <Circle cx="96" cy="33" r="13" fill="#fff" />
  </>
);

// 한쪽으로 크게 치우친 비대칭 형태.
const LopsidedCloud = () => (
  <>
    <Rect x="16" y="30" width="74" height="24" rx="12" fill="#fff" />
    <Circle cx="46" cy="27" r="23" fill="#fff" />
    <Circle cx="88" cy="34" r="14" fill="#fff" />
    <Circle cx="20" cy="36" r="11" fill="#fff" />
  </>
);

const SHAPES: Record<CloudShapeKind, () => React.JSX.Element> = {
  puffy: PuffyCloud,
  round: RoundCloud,
  lumpy: LumpyCloud,
  lopsided: LopsidedCloud,
};

const CloudShape = ({ width, height, opacity, shape }: { width: number; height: number; opacity: number; shape: CloudShapeKind }) => {
  const ShapeInner = SHAPES[shape];
  return (
    <Svg width={width} height={height} viewBox="0 0 120 60" opacity={opacity}>
      <ShapeInner />
    </Svg>
  );
};

const Cloud = ({ config }: { config: CloudConfig }) => {
  const startX = -config.width - 40;
  const endX = SCREEN_WIDTH + 40;
  const initialX = startX + (endX - startX) * config.startRatio;
  const translateX = useRef(new Animated.Value(initialX)).current;

  useEffect(() => {
    // 처음엔 이미 떠 있는 위치(initialX)에서 남은 거리만큼만 이동 → 끝까지 가면 그때부터 정식 루프(왼쪽 끝→오른쪽 끝) 시작
    const remainingRatio = Math.max((endX - initialX) / (endX - startX), 0.1);
    const firstLeg = Animated.timing(translateX, {
      toValue: endX,
      duration: config.duration * remainingRatio,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    let loop: Animated.CompositeAnimation | null = null;

    firstLeg.start(({ finished }) => {
      if (!finished) return;
      translateX.setValue(startX);
      loop = Animated.loop(
        Animated.sequence([
          Animated.delay(config.delay),
          Animated.timing(translateX, {
            toValue: endX,
            duration: config.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: startX,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    });

    return () => {
      firstLeg.stop();
      loop?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.cloud, { top: config.top, transform: [{ translateX }] }]}>
      <CloudShape width={config.width} height={config.height} opacity={config.opacity} shape={config.shape} />
    </Animated.View>
  );
};

/** 하늘에 아주 천천히 흘러가는 구름 여러 개. */
export const CloudLayer = () => (
  <>
    {CLOUDS.map((config, i) => (
      <Cloud key={i} config={config} />
    ))}
  </>
);

const styles = StyleSheet.create({
  cloud: {
    position: 'absolute',
    left: 0,
  },
});

export default CloudLayer;
