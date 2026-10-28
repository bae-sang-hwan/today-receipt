import auth, { type FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from '../config';
import { deleteRemoteData, fullSync } from './sync';
import { setLastPull, setLastSyncAt, setSyncError } from '../db/settings';
import { emitChange } from '../db/repo';

let configured = false;
const configure = () => {
  if (configured) return;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  configured = true;
};

const googleCredential = async () => {
  configure();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await GoogleSignin.signIn();
  if (res.type !== 'success') return null;
  const idToken = res.data.idToken;
  if (!idToken) throw new Error('Google ID 토큰을 받지 못했습니다.');
  return auth.GoogleAuthProvider.credential(idToken);
};

// 익명 계정이 있으면 Google 계정을 연결해 같은 uid로 이어 쓴다.
// 이미 쓰던 Google 계정이면 익명 계정의 서버 데이터를 지우고 그 계정으로 로그인한다.
// 기기의 기록은 이어서 fullSync로 그 계정에 합친다.
const linkOrSignIn = async (credential: FirebaseAuthTypes.AuthCredential) => {
  const anon = auth().currentUser;
  if (!anon?.isAnonymous) {
    await auth().signInWithCredential(credential);
    return;
  }
  try {
    await anon.linkWithCredential(credential);
    return;
  } catch (e) {
    if ((e as { code?: string })?.code !== 'auth/credential-already-in-use') throw e;
  }
  try {
    await deleteRemoteData(anon.uid);
    await anon.delete();
  } catch (e) {
    console.warn('익명 계정 정리 실패:', e);
  }
  await auth().signInWithCredential(credential);
};

// 성공하면 true, 사용자가 취소하면 false
export const signInWithGoogle = async () => {
  try {
    const credential = await googleCredential();
    if (!credential) return false;
    await linkOrSignIn(credential);
    emitChange('setting');
    await fullSync();
    return true;
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return false;
    throw e;
  }
};

const clearSyncState = () => {
  setLastPull(0);
  setLastSyncAt(null);
  setSyncError(null);
};

// 기기의 기록은 남긴다. 다음 동기화부터는 새 익명 계정으로 올린다.
export const signOut = async () => {
  configure();
  try {
    await GoogleSignin.signOut();
  } catch {}
  await auth().signOut();
  clearSyncState();
  emitChange('setting');
};

// 서버 기록과 계정을 지운다. 기기의 기록은 남긴다.
export const deleteAccount = async () => {
  const user = auth().currentUser;
  if (!user || user.isAnonymous) return;
  await deleteRemoteData(user.uid);
  try {
    await user.delete();
  } catch (e: any) {
    // 로그인한 지 오래되면 다시 인증해야 지울 수 있다.
    if (e?.code !== 'auth/requires-recent-login') throw e;
    const credential = await googleCredential();
    if (!credential) throw e;
    await user.reauthenticateWithCredential(credential);
    await user.delete();
  }
  configure();
  try {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch {}
  clearSyncState();
  emitChange('setting');
};
