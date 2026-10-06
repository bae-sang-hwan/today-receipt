import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useIAP, type Purchase } from 'expo-iap';
import { PREMIUM_FALLBACK_PRICE, PREMIUM_SKU } from '../config';
import { setPremium } from '../db/settings';
import { haptic } from '../haptics';

// 비소모성 인앱 상품 하나(평생 프리미엄). 구매 여부는 기기에 저장하고, 앱을 켤 때 Play 구매 내역으로 다시 확인한다.

interface PremiumApi {
  price: string;
  connected: boolean;
  purchasing: boolean;
  purchase: () => Promise<void>;
  restore: () => Promise<boolean>;
  lastError: string | null;
}

const PremiumContext = createContext<PremiumApi>({
  price: PREMIUM_FALLBACK_PRICE,
  connected: false,
  purchasing: false,
  purchase: async () => {},
  restore: async () => false,
  lastError: null,
});

const owns = (purchases: Purchase[]) => purchases.some((p) => p.productId === PREMIUM_SKU && p.purchaseState === 'purchased');

export const PremiumProvider = ({ children }: { children: React.ReactNode }) => {
  const [purchasing, setPurchasing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const finishRef = useRef<((args: { purchase: Purchase; isConsumable?: boolean }) => Promise<void>) | null>(null);

  const iap = useIAP({
    onPurchaseSuccess: async (purchase) => {
      if (purchase.productId !== PREMIUM_SKU) return;
      if (purchase.purchaseState === 'purchased') {
        try {
          await finishRef.current?.({ purchase, isConsumable: false });
        } catch (e) {
          console.warn('구매 확인 처리 실패:', e);
        }
        setPremium(true);
        haptic.success();
      }
      setPurchasing(false);
    },
    onPurchaseError: (error) => {
      setPurchasing(false);
      if (error.code !== 'user-cancelled') setLastError('결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.');
    },
  });
  finishRef.current = iap.finishTransaction;

  const { connected, fetchProducts, getAvailablePurchases } = iap;

  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: [PREMIUM_SKU], type: 'in-app' }).catch(() => {});
    getAvailablePurchases().catch(() => {});
  }, [connected, fetchProducts, getAvailablePurchases]);

  // 재설치나 기기 변경 후에도 같은 Google 계정이면 자동으로 다시 활성화한다.
  useEffect(() => {
    if (owns(iap.availablePurchases)) setPremium(true);
  }, [iap.availablePurchases]);

  const purchase = useCallback(async () => {
    setLastError(null);
    if (!connected) {
      setLastError('Play 스토어에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.');
      return;
    }
    setPurchasing(true);
    try {
      await iap.requestPurchase({ request: { google: { skus: [PREMIUM_SKU] } }, type: 'in-app' });
    } catch (e) {
      setPurchasing(false);
      setLastError('결제를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }, [connected, iap]);

  const restore = useCallback(async () => {
    setLastError(null);
    try {
      await getAvailablePurchases();
    } catch {
      setLastError('구매 내역을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.');
      return false;
    }
    return true;
  }, [getAvailablePurchases]);

  const product = iap.products.find((p) => p.id === PREMIUM_SKU);

  const value = useMemo(
    () => ({ price: product?.displayPrice ?? PREMIUM_FALLBACK_PRICE, connected, purchasing, purchase, restore, lastError }),
    [product?.displayPrice, connected, purchasing, purchase, restore, lastError],
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
};

export const usePremiumApi = () => useContext(PremiumContext);
