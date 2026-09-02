import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import firestore from '@react-native-firebase/firestore';

/**
 * 이 기기의 Expo 푸시 토큰을 발급받아 pushTokens/{uid}에 저장한다.
 * 가족 구성원이 소비를 기록했을 때 Cloud Function이 이 토큰으로 푸시를 보낸다.
 */
export const registerPushToken = async (uid: string): Promise<void> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    await firestore().collection('pushTokens').doc(uid).set({
      token,
      platform: Platform.OS,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.warn('푸시 토큰 등록 실패:', e);
  }
};
