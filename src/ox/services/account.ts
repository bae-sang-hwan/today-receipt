import auth from '@react-native-firebase/auth';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from '../config';
import { deleteRemoteData, fullSync, getSyncUser } from './sync';
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

// 성공하면 true, 사용자가 취소하면 false
export const signInWithGoogle = async () => {
  try {
    const credential = await googleCredential();
    if (!credential) return false;
    await auth().signInWithCredential(credential);
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

// 기기의 기록은 남기고 동기화만 멈춘다.
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
  const user = getSyncUser();
  if (!user) return;
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
