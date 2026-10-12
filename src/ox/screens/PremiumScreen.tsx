import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Tap, Txt } from '../components/ui';
import { useTheme } from '../theme';
import { usePremium } from '../hooks';
import { usePremiumApi } from '../services/premium';
import { FREE_CALENDAR_LIMIT } from '../config';
import { isPremium } from '../db/settings';
import type { ScreenProps } from '../navigation';

const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }[] = [
  { icon: 'close-circle-outline', title: '광고 제거', sub: '앱의 모든 화면에서' },
  { icon: 'infinite-outline', title: '캘린더 무제한', sub: `무료는 ${FREE_CALENDAR_LIMIT}개까지` },
  { icon: 'contrast-outline', title: '위젯 어두운 테마', sub: '홈 화면에 어울리게' },
  { icon: 'grid-outline', title: '1년 히트맵 · 요일별 통계', sub: '내 습관을 한눈에' },
];

// S08 프리미엄: 비소모성 인앱 상품 하나. 구독 아님.
export default function PremiumScreen({ navigation }: ScreenProps<'Premium'>) {
  const { colors } = useTheme();
  const premium = usePremium();
  const { price, purchasing, purchase, restore, lastError } = usePremiumApi();
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  // 구매가 끝나면 잠깐 보여주고 닫는다.
  useEffect(() => {
    if (!premium) return;
    const t = setTimeout(() => navigation.goBack(), 1200);
    return () => clearTimeout(t);
  }, [premium, navigation]);

  const onRestore = async () => {
    setRestoring(true);
    setRestoreMsg(null);
    const ok = await restore();
    setRestoring(false);
    // 구매 내역이 있으면 premium이 켜지면서 화면이 닫힌다.
    if (ok) setTimeout(() => !isPremium() && setRestoreMsg('이 Google 계정으로 구매한 내역이 없어요.'), 800);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Tap onPress={navigation.goBack} hitSlop={12} accessibilityLabel="닫기">
          <Ionicons name="close" size={26} color={colors.muted} />
        </Tap>
      </View>
      <View style={styles.body}>
        <Txt weight="extrabold" style={{ fontSize: 28, lineHeight: 38 }}>
          {premium ? '프리미엄이\n활성화됐어요' : '한 번 결제로\n평생 깔끔하게'}
        </Txt>
        <View>
          {BENEFITS.map((b, i) => (
            <View key={b.title} style={[styles.benefit, i < BENEFITS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }]}>
              <View style={[styles.icon, { backgroundColor: colors.oSoft }]}>
                <Ionicons name={b.icon} size={20} color={colors.o} />
              </View>
              <View>
                <Txt weight="semibold" style={{ fontSize: 16 }}>
                  {b.title}
                </Txt>
                <Txt style={{ color: colors.muted, fontSize: 13 }}>{b.sub}</Txt>
              </View>
            </View>
          ))}
        </View>
      </View>
      {!premium ? (
        <View style={styles.bottom}>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Txt weight="extrabold" style={{ fontSize: 30 }}>
              {price}
            </Txt>
            <Txt style={{ color: colors.muted, fontSize: 13 }}>한 번만 결제 · 구독 아님</Txt>
          </View>
          {lastError ? <Txt style={{ color: colors.x, fontSize: 13, textAlign: 'center' }}>{lastError}</Txt> : null}
          {restoreMsg && !lastError ? <Txt style={{ color: colors.muted, fontSize: 13, textAlign: 'center' }}>{restoreMsg}</Txt> : null}
          <Button title={purchasing ? '결제 진행 중…' : '프리미엄 구매'} onPress={purchase} disabled={purchasing} />
          <Button title={restoring ? '확인 중…' : '구매 복원'} variant="ghost" onPress={onRestore} disabled={restoring} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { height: 56, justifyContent: 'center', paddingHorizontal: 16 },
  body: { flex: 1, paddingHorizontal: 24, gap: 28, paddingTop: 12 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: 24, paddingBottom: 16, gap: 10 },
});
