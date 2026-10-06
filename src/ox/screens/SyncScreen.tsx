import React, { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth, { type FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ConfirmSheet, Header, Row, Tap, Txt } from '../components/ui';
import { useTheme } from '../theme';
import { haptic } from '../haptics';
import { useDataVersion } from '../hooks';
import { getLastSyncAt, getSyncError } from '../db/settings';
import { syncErrorMessage, syncNow } from '../services/sync';
import { deleteAccount, signInWithGoogle, signOut } from '../services/account';
import { ACCOUNT_DELETION_URL } from '../config';
import type { ScreenProps } from '../navigation';

const ago = (ms: number) => {
  const diff = Date.now() - ms;
  if (diff < 60_000) return '방금 전';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return `${Math.floor(diff / 86_400_000)}일 전`;
};

// S09 백업 및 동기화
export default function SyncScreen({ navigation }: ScreenProps<'Sync'>) {
  const { colors } = useTheme();
  const version = useDataVersion();
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(auth().currentUser);
  const [busy, setBusy] = useState<'login' | 'sync' | 'logout' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'logout' | 'delete' | null>(null);

  useEffect(() => auth().onAuthStateChanged(setUser), []);

  const signedIn = !!user && !user.isAnonymous;
  const lastSyncAt = useMemo(() => getLastSyncAt(), [version, busy]);
  const syncError = useMemo(() => getSyncError(), [version, busy]);

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<unknown>, failMsg: string) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch (e) {
      console.warn(e);
      haptic.warning();
      setError(failMsg);
    } finally {
      setBusy(null);
    }
  };

  if (!signedIn) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
        <Header title="백업 및 동기화" onBack={navigation.goBack} />
        <View style={styles.loggedOut}>
          <View style={[styles.bigIcon, { backgroundColor: colors.oSoft }]}>
            <Ionicons name="cloud-upload-outline" size={34} color={colors.o} />
          </View>
          <Txt weight="extrabold" style={{ fontSize: 22, textAlign: 'center' }}>
            폰을 바꿔도 기록은 그대로
          </Txt>
          <Txt style={{ color: colors.muted, textAlign: 'center', lineHeight: 22 }}>
            Google로 로그인하면 기록이 자동으로 백업돼요.{'\n'}로그인하지 않아도 지금처럼 이 기기에서 계속 쓸 수 있어요.
          </Txt>
          {error ? <Txt style={{ color: colors.x, fontSize: 13, textAlign: 'center' }}>{error}</Txt> : null}
          <Button
            title={busy === 'login' ? '로그인 중…' : 'Google로 백업 시작'}
            disabled={busy !== null}
            onPress={() => run('login', signInWithGoogle, '로그인하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.')}
            style={{ alignSelf: 'stretch', marginTop: 8 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <Header title="백업 및 동기화" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <Row
            title={user?.email ?? 'Google 계정'}
            sub="Google 계정으로 로그인됨"
            left={
              <View style={[styles.avatar, { backgroundColor: colors.oSoft }]}>
                <Txt weight="extrabold" style={{ color: colors.o }}>
                  G
                </Txt>
              </View>
            }
            last
          />
        </Card>
        <Card>
          <Row
            title="자동 백업"
            sub={
              busy === 'sync'
                ? '동기화 중…'
                : syncError
                  ? `${syncErrorMessage(syncError)}${__DEV__ ? ` (${syncError})` : ''}`
                  : lastSyncAt
                    ? `마지막 동기화 · ${ago(lastSyncAt)}`
                    : '아직 동기화하지 않았어요'
            }
            right={
              <Tap onPress={() => run('sync', syncNow, '동기화하지 못했어요.')} disabled={busy !== null} hitSlop={8}>
                <Txt weight="bold" style={{ color: colors.o }}>
                  지금 동기화
                </Txt>
              </Tap>
            }
            last
          />
        </Card>
        <Txt style={{ color: colors.muted, fontSize: 13.5, lineHeight: 20, paddingHorizontal: 4 }}>
          기록은 이 기기에 먼저 저장되고, 인터넷이 연결되면 자동으로 백업돼요. 폰을 바꿔도 같은 계정으로 로그인하면 그대로 돌아와요.
        </Txt>
        {error ? <Txt style={{ color: colors.x, fontSize: 13 }}>{error}</Txt> : null}
        <View style={{ gap: 10, marginTop: 20 }}>
          <Button title="로그아웃" variant="outline" disabled={busy !== null} onPress={() => setConfirm('logout')} />
          <Button title={busy === 'delete' ? '삭제 중…' : '계정 삭제'} variant="danger" disabled={busy !== null} onPress={() => setConfirm('delete')} />
          {ACCOUNT_DELETION_URL ? (
            <Tap onPress={() => Linking.openURL(ACCOUNT_DELETION_URL)} style={{ alignItems: 'center', paddingVertical: 6 }}>
              <Txt style={{ color: colors.muted, fontSize: 12.5, textDecorationLine: 'underline' }}>웹에서 계정 삭제 요청하기</Txt>
            </Tap>
          ) : null}
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={confirm === 'logout'}
        title="로그아웃할까요?"
        message="이 기기의 기록은 그대로 남고, 자동 백업만 멈춰요."
        confirmText="로그아웃"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          run('logout', signOut, '로그아웃하지 못했어요.');
        }}
      />
      <ConfirmSheet
        visible={confirm === 'delete'}
        title="계정을 삭제할까요?"
        message="서버에 백업된 기록과 계정이 모두 지워지고, 되돌릴 수 없어요. 이 기기의 기록은 남아요."
        confirmText="계정 삭제"
        danger
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          haptic.warning();
          setConfirm(null);
          run('delete', deleteAccount, '계정을 삭제하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12 },
  loggedOut: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, gap: 12, paddingBottom: 60 },
  bigIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
