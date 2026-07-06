import React, { useState, useEffect } from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Image, Alert, ScrollView} from 'react-native';
import auth from '@react-native-firebase/auth';
import { onGoogleButtonPress } from '../context/AuthContext';
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { deleteUserAccount } from '../api/authService';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = () => {
  const [user, setUser] = useState(auth().currentUser);

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
                  <Ionicons name="person" size={24} color="#b39ddb" />
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
                  {isAnonymous ? "🔒 익명 안심 모드 이용 중" : "로그인이 필요합니다"}
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
                <Ionicons name="logo-google" size={16} color="#b39ddb" style={{ marginRight: 8 }} />
                <Text style={styles.googleBtnText}>Google 계정 연결하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 일반 메뉴 리스트 */}
        <Text style={styles.sectionLabel}>앱 정보</Text>
        <View style={styles.menuCard}>
          <View style={styles.menuItem}>
            <Text style={styles.menuItemText}>현재 버전</Text>
            <Text style={styles.versionText}>1.0.2</Text>
          </View>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleDeleteAccount}
            activeOpacity={0.6}
          >
            <Text style={[styles.menuItemText, { color: '#f5a6a6' }]}>회원 탈퇴</Text>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e0" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fc'
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
    letterSpacing: -0.5,
  },
  scrollContent: {
    padding: 24
  },

  // 프로필 메인 카드 스타일링
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 2,
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
    backgroundColor: '#faf8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#f1eefc',
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 2,
  },
  userEmail: {
    color: '#a0aec0',
    fontSize: 13,
    fontWeight: '500',
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fff1f1',
  },
  logoutText: {
    color: '#f5a6a6',
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
    backgroundColor: '#faf8ff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1eefc',
    marginBottom: 14,
  },
  anonymousBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b39ddb',
  },
  loginTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 8,
    textAlign: 'center'
  },
  loginSubTitle: {
    fontSize: 13,
    color: '#718096',
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
    backgroundColor: '#faf8ff',
    borderWidth: 1,
    borderColor: '#f1eefc',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#b39ddb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  googleBtnText: {
    color: '#b39ddb',
    fontWeight: '700',
    fontSize: 14,
  },

  // 하단 메뉴 대시보드 카드 스타일링
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#a0aec0',
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a5568',
  },
  versionText: {
    fontSize: 14,
    color: '#a0aec0',
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#edf2f7',
  }
});

export default SettingsScreen;