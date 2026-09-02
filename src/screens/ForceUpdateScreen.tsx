import React from 'react';
import { Image, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/Text';
import { colors } from '../theme/colors';

type Props = {
  message: string;
  storeUrl: string;
  webStoreUrl: string;
};

// 최소 지원 버전보다 낮을 때 앱 전체를 가리는 화면. 뒤로가기/닫기 수단 없이 스토어로만 보낸다.
const ForceUpdateScreen = ({ message, storeUrl, webStoreUrl }: Props) => {
  const handlePress = async () => {
    try {
      const canOpen = await Linking.canOpenURL(storeUrl);
      await Linking.openURL(canOpen ? storeUrl : webStoreUrl);
    } catch (e) {
      Linking.openURL(webStoreUrl).catch(() => {});
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Image source={require('../../assets/splash-icon.png')} style={styles.icon} resizeMode="contain" />
        <Text style={styles.title}>업데이트가 필요해요</Text>
        <Text style={styles.message}>{message}</Text>

        <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.8}>
          <Text style={styles.buttonText}>지금 업데이트하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    width: 96,
    height: 96,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.black,
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: colors.placeHolder,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  button: {
    backgroundColor: colors.purple,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ForceUpdateScreen;
