import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { subscribe } from './db/repo';
import { todayKey } from './domain/date';
import { isPremium } from './db/settings';

// DB가 바뀌거나 앱이 다시 앞으로 오면(위젯에서 기록했을 수 있음) 숫자가 올라간다.
// 화면은 이 값을 의존성으로 두고 SQLite에서 다시 읽는다.
export const useDataVersion = () => {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    const unsub = subscribe(bump);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && bump());
    return () => {
      unsub();
      sub.remove();
    };
  }, []);
  return version;
};

// 자정이 지나면 "오늘"이 바뀐다.
export const useToday = () => {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const check = () => setToday((prev) => (prev === todayKey() ? prev : todayKey()));
    const timer = setInterval(check, 30_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return today;
};

export const usePremium = () => {
  const [premium, setPremiumState] = useState(isPremium);
  useEffect(() => subscribe((kind) => kind === 'setting' && setPremiumState(isPremium())), []);
  return premium;
};
