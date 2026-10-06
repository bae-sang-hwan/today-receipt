import React from 'react';
import { View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_ID } from '../config';
import { usePremium } from '../hooks';

// 무료 사용자에게만 화면 맨 아래 배너 하나. 프리미엄이면 아예 렌더링하지 않는다.
export const BannerSlot = () => {
  const premium = usePremium();
  if (premium) return null;
  return (
    <View style={{ alignItems: 'center' }}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={(e) => console.warn('배너 광고 로드 실패:', e)}
      />
    </View>
  );
};
