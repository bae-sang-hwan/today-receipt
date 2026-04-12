import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import {Alert} from "react-native";

// 초기 설정 (이 부분은 유지해 주세요)
GoogleSignin.configure({
  webClientId: '296991066097-2i9s6lddu6afbpidckl8ttt0k064jm6r.apps.googleusercontent.com',
  offlineAccess: true,
});

export const onGoogleButtonPress = async () => {
  try {
    const response = await GoogleSignin.signIn();

    if (response.type !== 'success') return;

    const idToken = response.data.idToken;
    if (!idToken) throw new Error("ID Token 없음");

    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    const currentUser = auth().currentUser;

    // 1. 익명 계정일 경우 연결 시도
    if (currentUser && currentUser.isAnonymous) {
      try {
        await currentUser.linkWithCredential(googleCredential);

        // 🔴 [수정] 서버에서 최신 프로필(이름, 사진, 익명여부 해제)을 다시 받아옵니다.
        await currentUser.reload();
        console.log("익명 계정 연결 및 프로필 갱신 완료");

        // 갱신된 유저 객체를 반환합니다.
        return auth().currentUser;
      } catch (linkError: any) {
        // 2. 이미 존재하는 계정일 경우 경고창 띄우기
        if (linkError.code === 'auth/credential-already-in-use') {
          return new Promise((resolve, reject) => {
            Alert.alert(
              "계정 연결 알림",
              "이 구글 계정은 이미 다른 데이터가 있습니다. 현재 작성 중인 내용은 사라지고 기존 계정의 데이터로 교체됩니다. 계속할까요?",
              [
                { text: "취소", style: "cancel", onPress: () => reject("사용자 취소") },
                {
                  text: "확인",
                  onPress: async () => {
                    try {
                      const result = await auth().signInWithCredential(googleCredential);
                      resolve(result);
                    } catch (signInError) {
                      reject(signInError);
                    }
                  }
                }
              ]
            );
          });
        }
        throw linkError;
      }
    } else {
      // 3. 익명이 아니면 그냥 로그인
      return await auth().signInWithCredential(googleCredential);
    }
  } catch (error: any) {
    if (error !== "사용자 취소") {
      console.error("구글 처리 중 최종 실패:", error);
    }
  }
};