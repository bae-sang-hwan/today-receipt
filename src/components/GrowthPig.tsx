import React from 'react';
import { Image } from 'react-native';
import { STAGE_ASSETS, stageForTotal } from '../constants/pig';

type Props = {
  happy: number;
  regret: number;
};

export const GrowthPig = ({ happy, regret }: Props) => {
  const stage = stageForTotal(happy + regret);
  const asset = STAGE_ASSETS[stage];
  if (!asset) return null;

  const width = asset.width;
  const height = width / asset.ratio;

  return <Image source={asset.source} resizeMode="contain" style={{ width, height }} />;
};

export default GrowthPig;
