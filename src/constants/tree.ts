export const STAGE_LABELS = ['씨앗', '새싹', '어린나무', '나무', '풍성한 나무', '만개'];
export const STAGE_THRESHOLDS = [0, 1, 3, 6, 10, 15];
// 씨앗(연두) → 풍성한 나무(진한 초록) 순서의 성장 단계 색상
export const STAGE_COLORS = ['#c8f5d9', '#9be8bc', '#6bd89e', '#3dbf82', '#1f9f68', '#059669'];

export type FruitAnchor = { x: number; y: number; r: number };

// 각 단계 이미지(assets/tree) 위 캐노피 영역에 맞춘 열매 위치. x/y는 이미지 폭/높이 대비 0~100% 좌표.
export const FRUIT_POOLS: Record<number, FruitAnchor[]> = {
  2: [
    { x: 50, y: 10, r: 4.6 },
    { x: 80, y: 30, r: 4.2 },
    { x: 20, y: 42, r: 4.4 },
    { x: 66, y: 66, r: 3.8 },
  ],
  3: [
    { x: 50, y: 7, r: 4.6 },
    { x: 26, y: 20, r: 4.2 },
    { x: 76, y: 18, r: 4.2 },
    { x: 15, y: 38, r: 4 },
    { x: 84, y: 36, r: 4 },
    { x: 50, y: 32, r: 4.4 },
  ],
  4: [
    { x: 50, y: 5, r: 4.6 },
    { x: 26, y: 14, r: 4.2 },
    { x: 74, y: 13, r: 4.2 },
    { x: 10, y: 28, r: 4 },
    { x: 90, y: 26, r: 4 },
    { x: 35, y: 36, r: 4.2 },
    { x: 65, y: 38, r: 4.2 },
    { x: 50, y: 46, r: 4.4 },
  ],
  5: [
    { x: 50, y: 6, r: 4.8 },
    { x: 25, y: 13, r: 4.4 },
    { x: 75, y: 12, r: 4.4 },
    { x: 10, y: 28, r: 4.2 },
    { x: 90, y: 26, r: 4.2 },
    { x: 30, y: 38, r: 4.2 },
    { x: 70, y: 40, r: 4.2 },
    { x: 50, y: 28, r: 4.6 },
    { x: 16, y: 50, r: 4 },
    { x: 84, y: 48, r: 4 },
  ],
};

export type StageAsset = {
  source: any;
  ratio: number; // width / height (트리밍된 실제 이미지 기준)
  width: number; // 렌더링 기준 폭(px)
};

// assets/tree의 PNG들은 투명 여백을 제거(trim)해서, 이미지 프레임의 맨 아래 = 실제 나무/씨앗이 닿는 바닥선이 되도록 맞춰뒀다.
// 각 단계 컨테이너를 화면에서 bottom 정렬만 해주면 단계가 바뀌어도 접지선이 항상 동일하게 유지된다.
// require()는 정적 문자열이어야 해서 여기서 직접 명시
export const STAGE_ASSETS: Record<number, StageAsset> = {
  1: { source: require('../../assets/tree/sprout.png'), ratio: 734 / 730, width: 70 },
  2: { source: require('../../assets/tree/young_tree.png'), ratio: 1002 / 1404, width: 130 },
  3: { source: require('../../assets/tree/tree.png'), ratio: 991 / 1493, width: 180 },
  4: { source: require('../../assets/tree/full_bloom.png'), ratio: 1020 / 1510, width: 210 },
  5: { source: require('../../assets/tree/abundant_tree.png'), ratio: 1192 / 1301, width: 340 },
};

// 씨앗(0단계) SVG를 새싹 이미지 속 씨앗과 같은 픽셀 크기로 맞추기 위한 타깃 크기.
// (새싹 이미지 안 씨앗이 트리밍된 이미지 폭의 약 27%를 차지하는 걸 실측해서, 새싹 렌더 폭 280px 기준으로 역산한 값)
export const SEED_RENDER_WIDTH = 19;
export const SEED_RENDER_HEIGHT = 23;

export const stageForTotal = (total: number): number => {
  let stage = 0;
  for (let i = 0; i < STAGE_THRESHOLDS.length; i++) {
    if (total >= STAGE_THRESHOLDS[i]) stage = i;
  }
  return stage;
};

export type FruitSlot = 'happy' | 'regret' | null;

export const assignFruitSlots = (stage: number, happy: number, regret: number): FruitSlot[] => {
  const pool = FRUIT_POOLS[stage];
  if (!pool) return [];

  const total = happy + regret;
  let happyCount = happy;
  let regretCount = regret;

  if (total > pool.length) {
    happyCount = Math.round(pool.length * (happy / total));
    if (happy > 0 && happyCount === 0) happyCount = 1;
    if (regret > 0 && happyCount === pool.length) happyCount = pool.length - 1;
    regretCount = pool.length - happyCount;
  }

  return pool.map((_, i) => (i < happyCount ? 'happy' : i < happyCount + regretCount ? 'regret' : null));
};

export const countHintForStage = (stage: number): string => {
  const hints = ['0개', '1~2개', '3~5개', '6~9개', '10~14개', '15개 이상'];
  return hints[stage] ?? hints[hints.length - 1];
};
