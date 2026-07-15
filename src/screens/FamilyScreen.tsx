import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Share, ActivityIndicator, Image } from 'react-native';
import { Text } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { useFamily } from '../context/FamilyContext';
import { colors } from '../theme/colors';

const FamilyScreen = () => {
  const navigation = useNavigation<any>();
  const { family, loading, generateInviteCode, joinFamily, leaveFamily, removeMember } = useFamily();
  const [inputCode, setInputCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(family?.inviteCode || null);
  const [busy, setBusy] = useState(false);

  const myUid = auth().currentUser?.uid;
  const isOwner = family?.ownerId === myUid;

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const code = await generateInviteCode();
      setGeneratedCode(code);
    } catch (e: any) {
      Alert.alert('에러', e.message || '코드 생성에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  const handleShare = () => {
    if (!generatedCode) return;
    Share.share({ message: `오늘의 영수증 가족 초대코드: ${generatedCode}\n앱에서 '가족연결 > 초대코드 입력'에 입력해주세요!` });
  };

  const handleJoin = async () => {
    if (!inputCode.trim()) return;
    setBusy(true);
    try {
      await joinFamily(inputCode);
      setInputCode('');
      Alert.alert('완료', '가족으로 연결되었어요!');
    } catch (e: any) {
      Alert.alert('에러', e.message || '연결에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = () => {
    Alert.alert('가족 나가기', '정말 가족 연결을 해제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await leaveFamily();
            setGeneratedCode(null);
          } catch (e: any) {
            Alert.alert('에러', e.message || '처리 중 문제가 발생했어요.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleRemove = (uid: string, name: string) => {
    Alert.alert('구성원 내보내기', `${name}님을 가족에서 내보낼까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '내보내기',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMember(uid);
          } catch (e: any) {
            Alert.alert('에러', e.message || '처리 중 문제가 발생했어요.');
          }
        },
      },
    ]);
  };

  const members = family ? Object.entries(family.members || {}) : [];
  const isFull = members.length >= 2;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={colors.o40} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>가족연결</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.purple} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* 초대코드 생성 */}
            {!isFull &&
              <View style={styles.card}>
                <Text style={styles.cardTitle}>초대코드 생성</Text>
                <Text style={styles.cardDesc}>코드를 생성해서 가족에게 공유하세요. 24시간 동안 유효해요.</Text>

                {generatedCode ? (
                  <View style={styles.codeBox}>
                    <Text style={styles.codeText}>{generatedCode}</Text>
                    <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
                      <Text style={styles.shareBtnText}>공유하기</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <TouchableOpacity style={styles.primaryBtn} onPress={handleGenerate} disabled={busy} activeOpacity={0.8}>
                  {busy ? <ActivityIndicator color={colors.white}/> : (
                    <Text style={styles.primaryBtnText}>{generatedCode ? '새 코드 생성' : '초대코드 생성하기'}</Text>
                  )}
                </TouchableOpacity>
              </View>}

            {/* 초대코드 입력 */}
            {!isFull &&
              <View style={styles.card}>
                <Text style={styles.cardTitle}>초대코드 입력하기</Text>
                <Text style={styles.cardDesc}>가족에게 받은 코드를 입력해서 연결하세요.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="예: A3F9K2"
                  placeholderTextColor={colors.placeHolder}
                  autoCapitalize="characters"
                  value={inputCode}
                  onChangeText={setInputCode}
                  maxLength={6}
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={handleJoin} disabled={busy} activeOpacity={0.8}>
                  {busy ? <ActivityIndicator color={colors.white}/> : <Text style={styles.primaryBtnText}>연결하기</Text>}
                </TouchableOpacity>
              </View>}

            {isFull && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>가족 연결 완료</Text>
                <Text style={styles.cardDesc}>
                  가족 연결은 최대 2명까지 가능해요. 다른 분과 연결하려면 먼저 가족 나가기를 해주세요.
                </Text>
              </View>
            )}

            {/* 가족 구성원 목록 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>가족 구성원 {members.length > 0 ? `(${members.length}명)` : ''}</Text>

              {members.length === 0 ? (
                <Text style={styles.emptyText}>아직 연결된 가족이 없어요.</Text>
              ) : (
                members.map(([uid, profile]: any) => (
                  <View key={uid} style={styles.memberRow}>
                    {profile.photoURL ? (
                      <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={16} color={colors.purple} />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      {uid === myUid
                        ? <Text style={styles.memberName}>
                            나{uid === family?.ownerId ? ' 👑' : ''}
                          </Text>
                        : <Text style={styles.memberName}>
                            {profile.displayName}{uid === family?.ownerId ? ' 👑' : ''}
                          </Text>}
                      {profile.email ? <Text style={styles.memberEmail}>{profile.email}</Text> : null}
                    </View>
                    {isOwner && uid !== myUid && (
                      <TouchableOpacity onPress={() => handleRemove(uid, profile.displayName)}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.red} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}

              {family && (
                <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
                  <Text style={styles.leaveBtnText}>가족 나가기</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.o5,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.black },
  scrollContent: { padding: 24 },
  card: {
    backgroundColor: colors.purple10, borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: colors.o5,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.black, marginBottom: 6 },
  cardDesc: { fontSize: 12, color: colors.placeHolder, lineHeight: 18, marginBottom: 14 },
  codeBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.o5,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12,
  },
  codeText: { fontSize: 22, fontWeight: '800', color: colors.purple, letterSpacing: 4 },
  shareBtn: { flexDirection: 'row', alignItems: 'center' },
  shareBtnText: { color: colors.purple, fontWeight: '600', fontSize: 12, marginLeft: 4 },
  primaryBtn: { backgroundColor: colors.purple, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  input: {
    backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.o5,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontWeight: '600', color: colors.black,
    marginBottom: 12, letterSpacing: 2,
  },
  emptyText: { fontSize: 13, color: colors.placeHolder, textAlign: 'center', paddingVertical: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.o5,
  },
  memberName: { fontSize: 14, fontWeight: '600', color: colors.black },
  memberEmail: { fontSize: 11, color: colors.placeHolder, marginTop: 1 },
  leaveBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  leaveBtnText: { color: colors.red, fontWeight: '600', fontSize: 13 },
});

export default FamilyScreen;