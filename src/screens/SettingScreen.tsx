import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Image, Alert, ScrollView, Animated } from 'react-native'
import { Text } from "../components/Text";
import auth from '@react-native-firebase/auth';
import { onGoogleButtonPress } from '../context/AuthContext';
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { deleteUserAccount } from '../api/authService';
import { Ionicons } from '@expo/vector-icons';
import {colors} from "../theme/colors";
import {useNavigation} from "@react-navigation/native";

const SettingsScreen = () => {

  const [user, setUser] = useState(auth().currentUser);
  const navigation = useNavigation<any>();

  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const googleProfile = user?.providerData.find(p => p.providerId === 'google.com');

  const displayName = googleProfile?.displayName || user?.displayName || '사용자';
  const photoURL = googleProfile?.photoURL || user?.photoURL;

  const handleLogout = async () => {
    Alert.alert(
      "로그아웃",
      "정말 로그아웃 하시겠습니까? 로그아웃 후에는 다시 익명 계정으로 시작됩니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "확인",
          onPress: async () => {
            try {
              await GoogleSignin.signOut();
              await auth().signOut();
            } catch (error) {
              console.error("로그아웃 중 에러 발생:", error);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "회원 탈퇴",
      "정말로 탈퇴하시겠습니까? 기록된 모든 데이터가 삭제됩니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴하기",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteUserAccount();
              Alert.alert("탈퇴 완료", "모든 계정 정보가 삭제되었습니다.");
            } catch (e: any) {
              if (e.message === 'REAUTH_REQUIRED') {
                Alert.alert(
                  "보안 재인증 필요",
                  "개인정보 보호를 위해 다시 로그인한 직후에만 탈퇴가 가능합니다. 다시 로그인 후 시도해 주세요."
                );
              } else {
                Alert.alert("에러", "탈퇴 처리 중 문제가 발생했습니다.");
              }
            }
          }
        },
      ]
    );
  };

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged((newUser) => {
      setUser(newUser);
    });
    return subscriber;
  }, []);

  const isAnonymous = user && user.isAnonymous;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 타이틀 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>설정</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 프로필 / 로그인 카드 카드 */}
        <View style={styles.profileCard}>
          {user && (googleProfile || !user.isAnonymous) ? (
            <View style={styles.profileWrapper}>
              {photoURL ? (
                <Image source={{ uri: photoURL }} style={styles.avatar} />
              ) : (
                <View style={styles.defaultAvatar}>
                  <Ionicons name="person" size={24} color={colors.purple} />
                </View>
              )}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{displayName}님</Text>
                <Text style={styles.userEmail}>{googleProfile?.email || user?.email}</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
                <Text style={styles.logoutText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loginContainer}>
              <View style={styles.anonymousBadge}>
                <Text style={styles.anonymousBadgeText}>
                  {isAnonymous ? "익명 로그인" : "로그인이 필요합니다"}
                </Text>
              </View>
              <Text style={styles.loginTitle}>소중한 지출 기록을 동기화하세요</Text>
              <Text style={styles.loginSubTitle}>
                구글 계정과 연결하면 앱을 삭제하거나 휴대폰을 바꿔도 기록이 안전하게 보관됩니다.
              </Text>

              <TouchableOpacity
                style={styles.googleBtn}
                activeOpacity={0.8}
                onPress={async () => {
                  try {
                    await onGoogleButtonPress();
                    setUser(auth().currentUser);
                  } catch (e) {
                    console.error("연결 중 오류 발생", e);
                  }
                }}
              >
                <Ionicons name="logo-google" size={16} color={colors.purple} style={{ marginRight: 8 }} />
                <Text style={styles.googleBtnText}>Google 계정 연결하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.menuCard}>
          <View style={styles.menuItem}>
            <Text style={styles.menuItemText}>현재 버전</Text>
            <Text style={styles.versionText}>1.0.2</Text>
          </View>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              if (!__DEV__ && (!user || user.isAnonymous)) {
                showToast('가족연결은 구글 로그인이 필요한 기능이에요');
                return;
              }
              navigation.navigate('Family');
            }}
            activeOpacity={0.6}
          >
            <Text style={styles.menuItemText}>가족연결</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.placeHolder} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleDeleteAccount}
            activeOpacity={0.6}
          >
            <Text style={[styles.menuItemText, { color: colors.red }]}>회원 탈퇴</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.red} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Animated.View
        pointerEvents="none"
        style={[styles.toast, { opacity: toastOpacity }]}
      >
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.o5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.black,
  },
  scrollContent: {
    padding: 24
  },

  toast: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    maxWidth: '80%',
  },
  toastText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  profileCard: {
    backgroundColor: colors.purple10,
    borderRadius: 12,
    padding: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.purple10
  },
  profileWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 16
  },
  defaultAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.purple10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: colors.o5,
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 2,
  },
  userEmail: {
    color: colors.placeHolder,
    fontSize: 13,
    fontWeight: '500',
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.red50,
  },
  logoutText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '700',
  },

  // 미연동/익명 상태 로그인 유도 뷰 구조
  loginContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  anonymousBadge: {
    backgroundColor: colors.purple10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.o5,
    marginBottom: 14,
  },
  anonymousBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.black,
    backgroundColor: colors.white
  },
  loginTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 4,
    textAlign: 'center'
  },
  loginSubTitle: {
    fontSize: 12,
    color: colors.o40,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '400',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple50,
    borderWidth: 1,
    borderColor: colors.o5,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
  },
  googleBtnText: {
    color: colors.purple,
    fontWeight: 'bold',
    fontSize: 14,
  },
  menuCard: {
    backgroundColor: colors.white,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.placeHolder,
  },
  versionText: {
    fontSize: 14,
    color: colors.placeHolder,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.o5,
  }
});

export default SettingsScreen;