import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { db } from './firebaseConfig';

// Google Play Console 자체엔 강제 업데이트 기능이 없어서,
// Firestore의 config/app 문서에 저장된 최소 지원 버전(minVersion)과
// 현재 앱 버전(app.json의 version, expo-constants로 읽음)을 비교해서 직접 막는다.
const ANDROID_PACKAGE = 'com.hyeheee.todayreceipt';
const IOS_APP_ID = ''; // 앱스토어 등록 후 Apple이 발급하는 숫자 ID로 채워넣기

const ANDROID_STORE_URL = `market://details?id=${ANDROID_PACKAGE}`;
const ANDROID_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
const IOS_STORE_URL = IOS_APP_ID ? `itms-apps://itunes.apple.com/app/id${IOS_APP_ID}` : ANDROID_STORE_WEB_URL;
const IOS_STORE_WEB_URL = IOS_APP_ID ? `https://apps.apple.com/app/id${IOS_APP_ID}` : ANDROID_STORE_WEB_URL;

export type ForceUpdateInfo = {
  required: boolean;
  message: string;
  storeUrl: string;
  webStoreUrl: string;
};

const DEFAULT_MESSAGE = '새로운 버전이 있어요. 원활한 서비스 이용을 위해 최신 버전으로 업데이트해주세요.';

// "1.0.10" vs "1.0.3" 같은 케이스도 정확히 비교하도록 숫자 단위로 쪼개서 비교.
export const isVersionLower = (current: string, min: string): boolean => {
  const c = current.split('.').map((n) => parseInt(n, 10) || 0);
  const m = min.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(c.length, m.length);

  for (let i = 0; i < len; i++) {
    const cv = c[i] ?? 0;
    const mv = m[i] ?? 0;
    if (cv < mv) return true;
    if (cv > mv) return false;
  }
  return false;
};

export const checkForceUpdate = async (): Promise<ForceUpdateInfo | null> => {
  // 개발 빌드는 네이티브 재빌드 전까지 app.json 버전 변경이 반영되지 않아
  // 오탐으로 막힐 수 있으니, 개발 중에는 체크 자체를 건너뛴다.
  if (__DEV__) return null;

  try {
    const currentVersion = Constants.expoConfig?.version ?? '0.0.0';

    const snap = await db.collection('config').doc('app').get();
    if (!snap.exists) return null;

    const data = snap.data() as { minVersion?: string; updateMessage?: string } | undefined;
    const minVersion = data?.minVersion;
    if (!minVersion || !isVersionLower(currentVersion, minVersion)) return null;

    return {
      required: true,
      message: data?.updateMessage || DEFAULT_MESSAGE,
      storeUrl: Platform.OS === 'android' ? ANDROID_STORE_URL : IOS_STORE_URL,
      webStoreUrl: Platform.OS === 'android' ? ANDROID_STORE_WEB_URL : IOS_STORE_WEB_URL,
    };
  } catch (e) {
    // 버전 체크 자체가 실패했다고 앱 사용을 막으면 안 되니, 조용히 통과시킨다.
    console.error('강제 업데이트 체크 실패:', e);
    return null;
  }
};
