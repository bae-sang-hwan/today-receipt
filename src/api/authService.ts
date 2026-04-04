import auth from '@react-native-firebase/auth';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

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

export const observeAuthState = (callback: (user: FirebaseAuthTypes.User | null) => void) => {
  return auth().onAuthStateChanged(callback);
};