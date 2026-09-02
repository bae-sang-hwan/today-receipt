import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Defs, RadialGradient, Stop } from 'react-native-svg';
import { FRUIT_POOLS, STAGE_ASSETS, SEED_RENDER_WIDTH, SEED_RENDER_HEIGHT, assignFruitSlots, stageForTotal } from '../constants/tree';

type Props = {
  happy: number;
  regret: number;
};

const FruitDefs = () => (
  <Defs>
    <RadialGradient id="fruitHappyGrad" cx="34%" cy="30%" r="68%">
      <Stop offset="0%" stopColor="#7fe3bd" />
      <Stop offset="55%" stopColor="#10a874" />
      <Stop offset="100%" stopColor="#05704a" />
    </RadialGradient>
    <RadialGradient id="fruitRegretGrad" cx="34%" cy="30%" r="68%">
      <Stop offset="0%" stopColor="#e8998c" />
      <Stop offset="55%" stopColor="#e3564a" />
      <Stop offset="100%" stopColor="#b93a28" />
    </RadialGradient>
  </Defs>
);

const Fruit = ({ x, y, r, slot }: { x: number; y: number; r: number; slot: 'happy' | 'regret' | null }) => {
  if (!slot) return null;
  return <Circle cx={x} cy={y} r={r} fill={slot === 'happy' ? 'url(#fruitHappyGrad)' : 'url(#fruitRegretGrad)'} />;
};

export const GrowthTree = ({ happy, regret }: Props) => {
  const stage = stageForTotal(happy + regret);

  if (stage === 0) {
    // 씨앗+그림자만 딱 감싸는 타이트한 뷰박스라서, 프레임 맨 아래 = 씨앗이 닿는 바닥선.
    // 크기도 새싹 이미지 속 씨앗과 같은 픽셀 크기로 맞춰뒀다.
    return (
      <Svg width={SEED_RENDER_WIDTH} height={SEED_RENDER_HEIGHT} viewBox="151 250 20 24">
        <Defs>
          <RadialGradient id="seedGrad" cx="35%" cy="28%" r="70%">
            <Stop offset="0%" stopColor="#cf9f6f" />
            <Stop offset="55%" stopColor="#a5713f" />
            <Stop offset="100%" stopColor="#6b4225" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={161} cy={266} rx={10} ry={6} fill="#000" opacity={0.12} />
        <Ellipse cx={160} cy={262} rx={9} ry={12} fill="url(#seedGrad)" />
        <Ellipse cx={157} cy={256} rx={2.2} ry={3.2} fill="#fff" opacity={0.6} transform="rotate(-18 157 256)" />
      </Svg>
    );
  }

  const asset = STAGE_ASSETS[stage];
  if (!asset) return null;

  const slots = assignFruitSlots(stage, happy, regret);
  const pool = FRUIT_POOLS[stage] || [];
  const width = asset.width;
  const height = width / asset.ratio;

  return (
    <ImageBackground source={asset.source} resizeMode="contain" style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 100 100" style={StyleSheet.absoluteFillObject}>
        <FruitDefs />
        {pool.map((anchor, i) => (
          <Fruit key={i} x={anchor.x} y={anchor.y} r={anchor.r} slot={slots[i]} />
        ))}
      </Svg>
    </ImageBackground>
  );
};

export default GrowthTree;
