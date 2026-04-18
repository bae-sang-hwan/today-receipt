import React, { useState, useEffect } from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Image, Alert} from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { onGoogleButtonPress } from '../context/AuthContext';
import {SafeAreaView} from "react-native-safe-area-context";
import {GoogleSignin} from "@react-native-google-signin/google-signin";

const SettingsScreen = () => {

  const [user, setUser] = useState(auth().currentUser);

  const googleProfile = user?.providerData.find(p => p.providerId === 'google.com');

  // 화면에 표시할 데이터 결정 (구글 정보가 있으면 구글 정보를, 없으면 유저 기본 정보를 사용)
  const displayName = googleProfile?.displayName || user?.displayName || '사용자';
  const photoURL = googleProfile?.photoURL || user?.photoURL;

  const handleLogout = async () => {
    Alert.alert(
      "로그아웃", // 제목
      "정말 로그아웃 하시겠습니까? 로그아웃 후에는 다시 익명 계정으로 시작됩니다.", // 메시지
      [
        {
          text: "취소",
          onPress: () => console.log("로그아웃 취소"),
          style: "cancel"
        },
        {
          text: "확인",
          onPress: async () => {
            try {
              // 구글 세션과 파이어베이스 세션을 모두 정리
              await GoogleSignin.signOut();
              await auth().signOut();
              console.log("로그아웃 완료 및 익명 전환 대기");
            } catch (error) {
              console.error("로그아웃 중 에러 발생:", error);
            }
          },
          style: "destructive" // 안드로이드는 동일하지만, iOS에서는 빨간색으로 강조됩니다.
        }
      ]
    );
  };

  useEffect(() => {
    // 2. 인증 상태 변경 리스너 등록
    // 사용자가 로그인하거나, 로그아웃하거나, 계정을 연결할 때마다 실행됩니다.
    const subscriber = auth().onAuthStateChanged((newUser) => {
      setUser(newUser);
    });

    return subscriber; // 컴포넌트 언마운트 시 리스너 해제
  }, []);

  // 구글 연동 여부 확인
  const isGoogleLinked = user?.providerData.some(p => p.providerId === 'google.com');
  const isAnonymous = user && user.isAnonymous;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.profileCard}>
        {user && (googleProfile || !user.isAnonymous) ? (
          <>
            {photoURL
              ? <Image source={{uri: photoURL }}
                       style={styles.avatar} />
              : <Image source={require('../../assets/today-icon.png')}
                       style={styles.avatar} />}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{displayName}님</Text>
              <Text style={styles.userEmail}>{googleProfile?.email || user?.email}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.loginContainer}>
            <Text style={styles.loginTitle}>
              {isAnonymous ? "익명 사용자 입니다." : "로그인이 필요합니다."}
            </Text>
            <Text style={styles.loginSubTitle}>
              구글 계정과 연결하면
            </Text>
            <Text style={styles.loginSubTitle}>
              앱을 삭제하더라도 데이터가 저장됩니다.
            </Text>
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={async () => {
                try {
                  await onGoogleButtonPress();

                  setUser(auth().currentUser);

                } catch (e) {
                  console.error("연결 중 오류 발생", e);
                }
              }}
            >
              <Text style={styles.googleBtnText}>Google 계정 연결하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.menuList}>
        <Text style={styles.menuItem}>앱 버전 1.0.1</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  profileCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 100,
    elevation: 3
  },
  userInfo: { flex: 1 },
  loginContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loginTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  loginSubTitle: { fontSize: 12, color: '#888', textAlign: 'center' },
  googleBtn: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12
  },
  googleBtnText: { color: '#fff', fontWeight: 'bold' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  userName: { fontSize: 18, fontWeight: 'bold' },
  userEmail: { color: '#888', fontSize: 14 },
  logoutBtn: { padding: 5 },
  logoutText: { color: '#ff4444', fontSize: 13 },
  menuList: { marginTop: 10, paddingHorizontal: 20 },
  menuItem: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#eee', color: '#444' }
});

export default SettingsScreen;