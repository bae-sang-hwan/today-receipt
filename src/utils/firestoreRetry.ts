// 콜드 스타트 시 Firebase Auth 토큰이 Firestore 클라이언트에 완전히 전파되기 전에
// 리스너가 먼저 붙어서 일시적으로 permission-denied가 나는 레이스를 완화하기 위한 래퍼.
// onSnapshot은 permission-denied를 받으면 리스너가 그대로 죽어버리고 자동 재시도를 하지 않기 때문에,
// 첫 permission-denied에 한해 짧게 한 번만 재구독을 시도하고 그래도 실패하면 진짜 에러로 전달한다.
export const onSnapshotWithRetry = (
  query: { onSnapshot: (onNext: (snapshot: any) => void, onError: (error: any) => void) => () => void },
  onNext: (snapshot: any) => void,
  onError: (error: any) => void,
  retryDelayMs = 1000
): (() => void) => {
  let cancelled = false;
  let retried = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let unsubscribe = () => {};

  const subscribe = () => {
    unsubscribe = query.onSnapshot(
      (snapshot) => onNext(snapshot),
      (error: any) => {
        if (cancelled) return;
        if (!retried && error?.code === 'firestore/permission-denied') {
          retried = true;
          retryTimer = setTimeout(() => {
            if (!cancelled) subscribe();
          }, retryDelayMs);
          return;
        }
        onError(error);
      }
    );
  };

  subscribe();

  return () => {
    cancelled = true;
    if (retryTimer) clearTimeout(retryTimer);
    unsubscribe();
  };
};
