import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

/**
 * 화면 전체에 깔리는 하늘색 세로 그라데이션. 위쪽은 진한 하늘색, 아래(언덕과 만나는 지점)는 밝게.
 */
export const SkyBackground = () => (
  <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
    <Defs>
      <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#7cc6ea" />
        <Stop offset="60%" stopColor="#bfe6ef" />
        <Stop offset="100%" stopColor="#eef8ee" />
      </LinearGradient>
    </Defs>
    <Rect x="0" y="0" width="100%" height="100%" fill="url(#skyGrad)" />
  </Svg>
);

export default SkyBackground;
