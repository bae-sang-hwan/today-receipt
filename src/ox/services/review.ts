import * as StoreReview from 'expo-store-review';
import { getRecord, getSetting, setSetting } from '../db/repo';
import { addDays, todayKey } from '../domain/date';
import { REVIEW_STREAK_DAYS } from '../config';

// 한 캘린더에 오늘까지 며칠 연속 O나 X를 기록하면 Play 스토어 리뷰창을 한 번 띄운다.
// Play가 실제로 창을 보여줄지는 따로 정하므로(횟수 제한), 요청은 한 번만 하고 다시 묻지 않는다.

const hasStreak = (calendarId: string) => {
  const today = todayKey();
  for (let i = 0; i < REVIEW_STREAK_DAYS; i++) {
    if (!getRecord(calendarId, addDays(today, -i))?.value) return false;
  }
  return true;
};

export const maybeRequestReview = async (calendarId: string) => {
  if (getSetting('review_requested') === '1' || !hasStreak(calendarId)) return;
  try {
    if (!(await StoreReview.hasAction())) return;
    setSetting('review_requested', '1');
    await StoreReview.requestReview();
  } catch (e) {
    console.warn('리뷰 요청 실패:', e);
  }
};
