import React, {useEffect, useRef, useState} from 'react';
import { StyleSheet, View, Text, Image, Animated, TouchableOpacity, BackHandler, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, CommonActions } from '@react-navigation/native';

const stampImages: { [key: string]: any } = {
  happy: require('../../assets/stamp_happy.png'),
  regret: require('../../assets/stamp_regret.png'),
};

const SaveCompleteScreen = ({ route }: any) => {

  const navigation = useNavigation<any>();

  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const { photoURL, emotion } = route.params;
  const stampImage = stampImages[emotion] || stampImages.happy;

  const stampOpacity = useRef(new Animated.Value(0)).current;
  const stampScale = useRef(new Animated.Value(8)).current;

  // ✅ 애니메이션 실행 함수를 별도로 분리
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
        <Ionicons name="checkmark-circle-outline" size={70} color="#2ecc71" style={styles.successIcon} />
        <Text style={styles.title}>기록 완료!</Text>
        <Text style={styles.subtitle}>오늘의 소비가 성공적으로 기록되었습니다.</Text>

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

          <Animated.Image
            source={stampImage}
            style={[
              styles.stampImage,
              {
                opacity: stampOpacity,
                transform: [{ scale: stampScale }, { rotate: '-18deg' }],
              },
            ]}
            resizeMode="contain"
          />

          {!isImageLoaded && (
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }]}>
              <Text style={{color: '#999'}}>사진 불러오는 중...</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.homeButton, { opacity: isImageLoaded ? 1 : 0.5 }]}
          onPress={handleGoHome}
          disabled={!isImageLoaded}
        >
          <Text style={styles.homeButtonText}>확인</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  successIcon: { marginBottom: 15 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#636e72', marginBottom: 25, textAlign: 'center' },
  imageWrapper: {
    width: '85%',
    height: 380,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 40,
    elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12,
  },
  receiptImage: { width: '100%', height: '100%' },

  stampImage: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 200,
    height: 200,
  },

  homeButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 18,
    paddingHorizontal: 70,
    borderRadius: 14,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
  },
  homeButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default SaveCompleteScreen;