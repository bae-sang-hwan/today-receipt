import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

/**
 * 나무 화면 하단에 깔리는 연두색 언덕. 화면 폭에 맞춰 늘어나도록 preserveAspectRatio="none" 사용.
 */
export const HillBackground = () => (
  <Svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="none">
    <Defs>
      <LinearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#cdec86" />
        <Stop offset="100%" stopColor="#9ad358" />
      </LinearGradient>
    </Defs>
    <Path d="M0,220 L0,118 Q200,6 400,118 L400,220 Z" fill="url(#hillGrad)" />
  </Svg>
);

export default HillBackground;
