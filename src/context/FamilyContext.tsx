import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export type FamilyMemberProfile = {
  displayName: string;
  photoURL?: string | null;
  email?: string | null;
};

type FamilyData = {
  id: string;
  ownerId: string;
  memberIds: string[];
  members: { [uid: string]: FamilyMemberProfile };
  inviteCode?: string;
};

type FamilyContextType = {
  family: FamilyData | null;
  familyMemberIds: string[]; // 가족 없으면 [본인 uid]
  loading: boolean;
  generateInviteCode: () => Promise<string>;
  joinFamily: (code: string) => Promise<void>;
  leaveFamily: () => Promise<void>;
  removeMember: (uid: string) => Promise<void>;
};

const MAX_FAMILY_SIZE = 2;

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);
const CODE_VALID_MS = 24 * 60 * 60 * 1000;

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [userId, setUserId] = useState(auth().currentUser?.uid);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [family, setFamily] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => auth().onAuthStateChanged((u) => setUserId(u?.uid)), []);

  useEffect(() => {
    if (!userId) {
      setFamilyId(null);
      setFamily(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return firestore().collection('userFamily').doc(userId).onSnapshot((doc) => {
      const fid = doc.exists() ? (doc.data()?.familyId ?? null) : null;
      setFamilyId(fid);
      if (!fid) {
        setFamily(null);
        setLoading(false);
      }
    }, () => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!familyId) return;
    return firestore().collection('families').doc(familyId).onSnapshot((doc) => {
      setFamily(doc.exists() ? { id: doc.id, ...(doc.data() as any) } : null);
      setLoading(false);
    }, () => setLoading(false));
  }, [familyId]);

  const getMyProfile = useCallback((): FamilyMemberProfile => {
    const u = auth().currentUser;
    return { displayName: u?.displayName || '가족 구성원', photoURL: u?.photoURL || null, email: u?.email || null };
  }, []);

  const generateInviteCode = useCallback(async () => {
    if (!userId) throw new Error('로그인이 필요합니다.');

    let fid = familyId;

    if (!fid) {
      const ref = firestore().collection('families').doc();
      fid = ref.id;
      await ref.set({
        ownerId: userId,
        memberIds: [userId],
        members: { [userId]: getMyProfile() },
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      await firestore().collection('userFamily').doc(userId).set({ familyId: fid });
    } else if (family && family.memberIds.length >= MAX_FAMILY_SIZE) {
      throw new Error('가족은 최대 2명까지 등록할 수 있어요.');
    }

    const code = generateCode();
    await firestore().collection('inviteCodes').doc(code).set({
      familyId: fid,
      createdBy: userId,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    await firestore().collection('families').doc(fid).update({ inviteCode: code });
    return code;
  }, [userId, familyId, family, getMyProfile]);

  const joinFamily = useCallback(async (rawCode: string) => {

    if (!userId) throw new Error('로그인이 필요합니다.');
    const code = rawCode.trim().toUpperCase();
    if (!code) throw new Error('초대코드를 입력해주세요.');

    const codeDoc = await firestore().collection('inviteCodes').doc(code).get();
    if (!codeDoc.exists()) throw new Error('유효하지 않은 초대코드예요.');

    const data = codeDoc.data() as any;
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().getTime() : 0;
    if (createdAt && Date.now() - createdAt > CODE_VALID_MS) {
      throw new Error('만료된 초대코드예요. 새 코드를 요청해주세요.');
    }
    if (data.familyId === familyId) throw new Error('이미 참여 중인 가족이에요.');

    const targetFamilySnap = await firestore().collection('families').doc(data.familyId).get();
    const targetMemberIds = (targetFamilySnap.data() as any)?.memberIds || [];
    if (targetMemberIds.length >= MAX_FAMILY_SIZE) {
      throw new Error('이 가족은 이미 인원이 가득찼어요.');
    }

    await firestore().collection('families').doc(data.familyId).update({
      memberIds: firestore.FieldValue.arrayUnion(userId),
      [`members.${userId}`]: getMyProfile(),
    });
    await firestore().collection('userFamily').doc(userId).set({ familyId: data.familyId });
  }, [userId, familyId, getMyProfile]);

  const leaveFamily = useCallback(async () => {
    if (!userId || !familyId) return;
    const familyRef = firestore().collection('families').doc(familyId);
    const snap = await familyRef.get();
    const data = snap.data() as any;
    const remaining = (data?.memberIds || []).filter((id: string) => id !== userId);

    if (remaining.length === 0) {
      await familyRef.delete();
    } else {
      await familyRef.update({
        memberIds: firestore.FieldValue.arrayRemove(userId),
        [`members.${userId}`]: firestore.FieldValue.delete(),
        ...(data?.ownerId === userId ? { ownerId: remaining[0] } : {}),
      });
    }
    await firestore().collection('userFamily').doc(userId).delete();
  }, [userId, familyId]);

  const removeMember = useCallback(async (targetUid: string) => {
    if (!userId || !familyId || !family) return;
    if (family.ownerId !== userId) throw new Error('가족장만 구성원을 내보낼 수 있어요.');
    if (targetUid === userId) throw new Error('본인은 나가기를 이용해주세요.');

    await firestore().collection('families').doc(familyId).update({
      memberIds: firestore.FieldValue.arrayRemove(targetUid),
      [`members.${targetUid}`]: firestore.FieldValue.delete(),
    });
    await firestore().collection('userFamily').doc(targetUid).delete();
  }, [userId, familyId, family]);

  const familyMemberIds = family?.memberIds?.length ? family.memberIds : (userId ? [userId] : []);

  return (
    <FamilyContext.Provider value={{ family, familyMemberIds, loading, generateInviteCode, joinFamily, leaveFamily, removeMember }}>
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamily must be used within FamilyProvider');
  return ctx;
};