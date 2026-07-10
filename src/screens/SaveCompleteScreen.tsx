import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Image, Animated, TouchableOpacity, BackHandler, Platform } from 'react-native';
import { Text } from "../components/Text";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const adUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-5927873314061819/2518464072';

const stampImages: { [key: string]: any } = {
  happy: require('../../assets/stamp_happy.png'),
  regret: require('../../assets/stamp_regret.png'),
};

const SaveCompleteScreen = ({ route }: any) => {
  const navigation = useNavigation<any>();
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // ⭐️ 기기별 하단 내비게이션 바 높이를 동적으로 계산하는 훅
  const insets = useSafeAreaInsets();

  const { photoURL, emotion } = route.params;
  const stampImage = stampImages[emotion] || stampImages.happy;

  const stampOpacity = useRef(new Animated.Value(0)).current;
  const stampScale = useRef(new Animated.Value(8)).current;

  const startStampAnimation = () => {
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(stampOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(stampScale, { toValue: 0.95, duration: 150, useNativeDriver: true }),
      ]),
      Animated.timing(stampScale, { toValue: 1.0, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    });
  };

  const handleGoHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Root' }],
      })
    );
  };

  useEffect(() => {
    const backAction = () => {
      handleGoHome();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* 파스텔 라벤더 서클 아이콘 컨테이너 */}
        <View style={styles.successIconBox}>
          <Ionicons name="checkmark" size={32} color="#6200ee" />
        </View>

        <Text style={styles.title}>기록 완료!</Text>
        <Text style={styles.subtitle}>오늘의 소비가 성공적으로 기록되었습니다.</Text>

        {/* 인스타 감성의 라운디드 이미지 액자 */}
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: photoURL }}
            style={styles.receiptImage}
            resizeMode="cover"
            onLoad={() => {
              setIsImageLoaded(true);
              startStampAnimation();
            }}
          />

          {/* 애니메이션이 적용되는 오리지널 스탬프 뷰 */}
          <Animated.Image
            source={stampImage}
            style={[
              styles.stampImage,
              {
                opacity: stampOpacity,
                transform: [{ scale: stampScale }, { rotate: '-15deg' }],
              },
            ]}
            resizeMode="contain"
          />

          {!isImageLoaded && (
            <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
              <Text style={styles.loadingText}>사진 불러오는 중...</Text>
            </View>
          )}
        </View>

        {/* 하단 메인 플랫 버튼 */}
        <TouchableOpacity
          style={[styles.homeButton, { opacity: isImageLoaded ? 1 : 0.5 }]}
          onPress={handleGoHome}
          disabled={!isImageLoaded}
          activeOpacity={0.8}
        >
          <Text style={styles.homeButtonText}>확인</Text>
        </TouchableOpacity>
      </View>

      {/* ⭐️ 기기 하단 내비게이션 바 높이만큼 paddingBottom을 동적으로 주입 */}
      <View style={[
        styles.bottomAdContainer,
      ]}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdFailedToLoad={(error) => {
            console.error('완료 화면 광고 로드 실패: ', error);
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#faf8ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1eefc',
    marginBottom: 20,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: '500',
  },
  imageWrapper: {
    width: '85%',
    height: 360,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 44,
    backgroundColor: '#f8f9fc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 6,
  },
  receiptImage: {
    width: '100%',
    height: '100%'
  },
  stampImage: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 160,
    height: 160,
  },
  loadingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fc'
  },
  loadingText: {
    color: '#a0aec0',
    fontSize: 13,
    fontWeight: '500',
  },
  homeButton: {
    backgroundColor: '#6200ee',
    width: '85%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  homeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  bottomAdContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // 👈 배경을 투명하게 설정
  },
});

export default SaveCompleteScreen;