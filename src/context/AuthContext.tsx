import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';

// 초기 설정
GoogleSignin.configure({
  webClientId: '296991066097-2i9s6lddu6afbpidckl8ttt0k064jm6r.apps.googleusercontent.com',
  offlineAccess: true,
});

export const onGoogleButtonPress = async () => {
  try {
    // 1. 구글 로그인 시도 (반환 구조 변경 대응)
    const response = await GoogleSignin.signIn();

    // 최신 버전에서는 response.data 안에 idToken이 있습니다.
    const idToken = response.data?.idToken;

    if (!idToken) {
      throw new Error("ID Token이 존재하지 않습니다.");
    }

    // 2. 받은 토큰으로 파이어베이스 자격 증명 생성
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    // 3. 파이어베이스 로그인 완료
    return auth().signInWithCredential(googleCredential);
  } catch (error: any) {
    // 사용자가 로그인을 취소한 경우 등 에러 처리
    console.error("구글 로그인 실패:", error);
  }
};