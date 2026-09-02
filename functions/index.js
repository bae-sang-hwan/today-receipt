const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

/**
 * receipts 컬렉션에 새 영수증이 생성되면, 같은 가족의 다른 구성원에게 푸시 알림을 보낸다.
 */
exports.onReceiptCreated = onDocumentCreated('receipts/{receiptId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const receipt = snapshot.data();
  const authorUid = receipt.userId;
  if (!authorUid) return;

  const userFamilySnap = await db.collection('userFamily').doc(authorUid).get();
  const familyId = userFamilySnap.exists ? userFamilySnap.data().familyId : null;
  if (!familyId) return;

  const familySnap = await db.collection('families').doc(familyId).get();
  if (!familySnap.exists) return;

  const family = familySnap.data();
  const recipientUids = (family.memberIds || []).filter((uid) => uid !== authorUid);
  if (recipientUids.length === 0) return;

  const tokenSnaps = await Promise.all(
    recipientUids.map((uid) => db.collection('pushTokens').doc(uid).get())
  );
  const tokens = tokenSnaps
    .filter((snap) => snap.exists && snap.data().token)
    .map((snap) => snap.data().token);

  if (tokens.length === 0) return;

  const authorName = family.members?.[authorUid]?.displayName || '가족';
  const amount = Number(receipt.amount || 0).toLocaleString();
  const emotionText = receipt.emotion === 'regret' ? '후회되는' : '잘 산';

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title: '오늘의 영수증',
    body: `${authorName}님이 ${amount}원을 기록했어요 (${emotionText} 소비)`,
    data: { type: 'family_receipt', receiptId: event.params.receiptId },
  }));

  await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
});
