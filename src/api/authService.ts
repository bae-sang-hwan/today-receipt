import auth from '@react-native-firebase/auth';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const getOrCreateUser = (): Promise<FirebaseAuthTypes.User> => {
  return new Promise((resolve, reject) => {
    console.log("1. 인증 확인 시작...");
    const currentUser = auth().currentUser;

    if (currentUser) {
      console.log("2. 이미 로그인된 유저 발견:", currentUser.uid);
      resolve(currentUser);
      return;
    }

    const unsubscribe = auth().onAuthStateChanged((user) => {
      unsubscribe();
      if (user) {
        console.log("3. 기존 유저 복구 성공:", user.uid);
        resolve(user);
      } else {
        console.log("4. 유저 없음 -> 새로 생성 시도");
        auth().signInAnonymously()
          .then((userCredential) => {
            console.log("5. 새 유저 생성 완료:", userCredential.user.uid);
            resolve(userCredential.user);
          })
          .catch(reject);
      }
    });
  });
};

export const deleteUserAccount = async () => {
  try {
    const user = auth().currentUser;
    if (!user) return;

    // 1. 구글 로그인 사용자인지 확인
    const isGoogleUser = user.providerData.some(
      (provider) => provider.providerId === 'google.com'
    );

    if (isGoogleUser) {
      // 구글 로그인의 경우 앱과의 연동을 완전히 끊어줌 (Revoke Access)
      try {
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
      } catch (e) {
        console.log("구글 연동 해제 중 오류(이미 로그아웃 상태일 수 있음):", e);
      }
    }

    // 2. Firebase 계정 삭제
    // 주의: 구글 로그인의 경우 로그인한 지 오래되었다면 여기서 에러가 발생할 수 있음
    await user.delete();

    console.log("계정 및 연동 삭제 완료");
  } catch (error: any) {
    // 3. 재인증 에러 처리 (로그인한 지 오래되어 보안상 바로 삭제가 안 되는 경우)
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('REAUTH_REQUIRED');
    }
    throw error;
  }
};

export const observeAuthState = (callback: (user: FirebaseAuthTypes.User | null) => void) => {
  return auth().onAuthStateChanged(callback);
};