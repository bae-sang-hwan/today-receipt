import { signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebaseConfig";

export const getOrCreateUser = (): Promise<User> => {
  return new Promise((resolve, reject) => {
    console.log("1. 인증 확인 시작...");
    const currentUser = auth.currentUser;

    if (currentUser) {
      console.log("2. 이미 로그인된 유저 발견:", currentUser.uid);
      resolve(currentUser);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        console.log("3. 기존 유저 복구 성공:", user.uid);
        resolve(user);
      } else {
        console.log("4. 유저 없음 -> 새로 생성 시도");
        signInAnonymously(auth)
          .then((userCredential) => {
            console.log("5. 새 유저 생성 완료:", userCredential.user.uid);
            resolve(userCredential.user);
          })
          .catch(reject);
      }
    });
  });
};

// 현재 로그인 상태 관찰자 (App.tsx에서 사용)
export const observeAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};