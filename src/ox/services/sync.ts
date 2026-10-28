import auth from '@react-native-firebase/auth';
import firestore, { type FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import {
  applyRemoteCalendar,
  applyRemoteRecord,
  clearPhotoOp,
  emitChange,
  getCalendarRowAny,
  getDirtyCalendarRows,
  getDirtyRecordRows,
  getPhotoOps,
  getRecordRowAny,
  markAllDirty,
  markCalendarClean,
  markRecordClean,
} from '../db/repo';
import { getLastPull, setLastPull, setLastSyncAt, setSyncError } from '../db/settings';
import { photoFile } from '../db/photos';

// 기기 저장소가 기준. 바뀐 행(dirty)을 올리고, 서버에서 바뀐 것을 받아온다.
// Google로 로그인하지 않았으면 익명 계정을 만들어 그 계정으로 올린다.
// 같은 날짜가 겹치면 updatedAt이 더 늦은 값을 남긴다.
// 서버 경로: users/{uid}/calendars/{id}, users/{uid}/records/{calendarId}_{date}
// 사진 파일은 Storage의 users/{uid}/photos/{photoId}.jpg에 둔다.

const BATCH_LIMIT = 400;

// 동기화 실패 코드를 사용자에게 보여줄 문구로 바꾼다.
export const syncErrorMessage = (code: string) => {
  if (code === 'firestore/unavailable' || code === 'firestore/deadline-exceeded' || code.includes('network')) {
    return '인터넷 연결을 확인해 주세요';
  }
  if (code === 'firestore/permission-denied' || code === 'firestore/unauthenticated') {
    return '백업 서버에 접근할 수 없어요. 다시 로그인해 보세요';
  }
  if (code === 'storage/quota-exceeded') {
    return '사진을 백업할 공간이 부족해요. 잠시 후 다시 시도해 주세요';
  }
  return '동기화하지 못했어요. 잠시 후 다시 시도해 주세요';
};

export const getSyncUser = () => auth().currentUser;

// 익명 계정을 새로 만들면 기기의 기록과 사진을 처음부터 다시 올린다.
const ensureSyncUser = async () => {
  const user = auth().currentUser;
  if (user) return user;
  const { user: anon } = await auth().signInAnonymously();
  markAllDirty();
  setLastPull(0);
  return anon;
};

const userDoc = (uid: string) => firestore().collection('users').doc(uid);
const photoRef = (uid: string, id: string) => storage().ref(`users/${uid}/photos/${id}.jpg`);
const isNotFound = (e: unknown) => (e as { code?: string })?.code === 'storage/object-not-found';

let running: Promise<boolean> | null = null;
let again = false;

export const syncNow = (): Promise<boolean> => {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    let ok = true;
    try {
      do {
        again = false;
        await runOnce();
      } while (again);
      setSyncError(null);
      setLastSyncAt(Date.now());
    } catch (e) {
      console.warn('동기화 실패:', e);
      setSyncError(String((e as { code?: string })?.code ?? 'unknown'));
      ok = false;
    } finally {
      running = null;
    }
    return ok;
  })();
  return running;
};

// 처음 로그인했을 때: 기기 기록을 전부 올리고, 서버 기록을 전부 받아 합친다.
export const fullSync = () => {
  markAllDirty();
  setLastPull(0);
  return syncNow();
};

let timer: ReturnType<typeof setTimeout> | null = null;
export const scheduleSync = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    syncNow();
  }, 2000);
};

const runOnce = async () => {
  const user = await ensureSyncUser();
  // 먼저 받아온다. 서버 값이 더 최신이면 기기 값을 덮고 dirty가 풀리므로,
  // 오래된 기기 값이 서버의 최신 값을 덮어쓰지 않는다.
  await pull(user.uid);
  // 기록보다 사진을 먼저 올려, 다른 기기가 기록을 받았을 때 사진도 받을 수 있게 한다.
  await pushPhotos(user.uid);
  await push(user.uid);
};

const pushPhotos = async (uid: string) => {
  for (const { id, op } of getPhotoOps()) {
    if (op === 'upload') {
      const file = photoFile(id);
      if (file.exists) await photoRef(uid, id).putFile(file.uri, { contentType: 'image/jpeg' });
    } else {
      try {
        await photoRef(uid, id).delete();
      } catch (e) {
        if (!isNotFound(e)) throw e;
      }
    }
    clearPhotoOp(id, op);
  }
};

// 기기에 없는 사진(다른 기기에서 넣은 사진)은 보여줄 때 서버에서 받아온다. 못 받으면 null.
const downloading = new Map<string, Promise<string | null>>();
export const ensureLocalPhoto = (id: string): Promise<string | null> => {
  const file = photoFile(id);
  if (file.exists) return Promise.resolve(file.uri);
  const user = getSyncUser();
  if (!user) return Promise.resolve(null);
  let task = downloading.get(id);
  if (!task) {
    task = (async () => {
      try {
        await photoRef(user.uid, id).writeToFile(file.uri);
        return file.uri;
      } catch (e) {
        if (!isNotFound(e)) console.warn('사진 받기 실패:', e);
        return null;
      } finally {
        downloading.delete(id);
      }
    })();
    downloading.set(id, task);
  }
  return task;
};

const commitInChunks = async (ops: ((b: FirebaseFirestoreTypes.WriteBatch) => void)[]) => {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = firestore().batch();
    ops.slice(i, i + BATCH_LIMIT).forEach((op) => op(batch));
    await batch.commit();
  }
};

const push = async (uid: string) => {
  const root = userDoc(uid);
  const calendars = getDirtyCalendarRows();
  const records = getDirtyRecordRows();
  if (calendars.length === 0 && records.length === 0) return;

  const syncedAt = firestore.FieldValue.serverTimestamp();
  const ops: ((b: FirebaseFirestoreTypes.WriteBatch) => void)[] = [];

  calendars.forEach((c) => {
    ops.push((b) =>
      b.set(root.collection('calendars').doc(c.id), {
        name: c.name, color: c.color, markStyle: c.mark_style, order: c.sort_order, reminder: c.reminder,
        createdAt: c.created_at, updatedAt: c.updated_at, deleted: c.deleted === 1, syncedAt,
      }),
    );
  });
  records.forEach((r) => {
    ops.push((b) =>
      b.set(root.collection('records').doc(`${r.calendar_id}_${r.date}`), {
        calendarId: r.calendar_id, date: r.date, value: r.value, memo: r.memo, photo: r.photo, updatedAt: r.updated_at, syncedAt,
      }),
    );
  });
  await commitInChunks(ops);

  // 지운 캘린더의 서버 기록도 지운다.
  for (const c of calendars.filter((c) => c.deleted === 1)) {
    const snap = await root.collection('records').where('calendarId', '==', c.id).get({ source: 'server' });
    await commitInChunks(snap.docs.map((d) => (b) => b.delete(d.ref)));
  }

  calendars.forEach((c) => markCalendarClean(c.id, c.updated_at));
  records.forEach((r) => markRecordClean(r.calendar_id, r.date, r.updated_at));
};

const millisOf = (v: unknown) => (v instanceof firestore.Timestamp ? v.toMillis() : 0);

const pull = async (uid: string) => {
  const root = userDoc(uid);
  const since = firestore.Timestamp.fromMillis(getLastPull());
  let maxSeen = getLastPull();
  let changed = false;

  const calSnap = await root.collection('calendars').where('syncedAt', '>', since).get({ source: 'server' });
  calSnap.docs.forEach((d) => {
    const data = d.data();
    maxSeen = Math.max(maxSeen, millisOf(data.syncedAt));
    const local = getCalendarRowAny(d.id);
    if (local && local.updated_at >= data.updatedAt) return;
    applyRemoteCalendar({
      id: d.id, name: data.name, color: data.color, markStyle: data.markStyle, order: data.order ?? 0,
      reminder: data.reminder ?? null, createdAt: data.createdAt, updatedAt: data.updatedAt, deleted: !!data.deleted,
    });
    changed = true;
  });

  const recSnap = await root.collection('records').where('syncedAt', '>', since).get({ source: 'server' });
  recSnap.docs.forEach((d) => {
    const data = d.data();
    maxSeen = Math.max(maxSeen, millisOf(data.syncedAt));
    const calendar = getCalendarRowAny(data.calendarId);
    if (calendar?.deleted === 1) return;
    const local = getRecordRowAny(data.calendarId, data.date);
    if (local && local.updated_at >= data.updatedAt) return;
    applyRemoteRecord({
      calendarId: data.calendarId, date: data.date, value: data.value ?? '', memo: data.memo ?? '', photo: data.photo ?? '', updatedAt: data.updatedAt,
    });
    changed = true;
  });

  setLastPull(maxSeen);
  if (changed) {
    emitChange('calendar');
    emitChange('record');
  }
};

// 계정 삭제 시 서버의 기록과 사진을 모두 지운다.
export const deleteRemoteData = async (uid: string) => {
  const photos = await storage().ref(`users/${uid}/photos`).listAll();
  for (const item of photos.items) {
    try {
      await item.delete();
    } catch (e) {
      if (!isNotFound(e)) throw e;
    }
  }
  const root = userDoc(uid);
  for (const name of ['records', 'calendars']) {
    const snap = await root.collection(name).get({ source: 'server' });
    await commitInChunks(snap.docs.map((d) => (b) => b.delete(d.ref)));
  }
  await root.delete();
};
