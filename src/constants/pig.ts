export const STAGE_LABELS = ['기본 돼지', '은색 돼지', '금색 돼지'];
export const STAGE_THRESHOLDS = [0, 5, 15];
// 기본(핑크) → 은색 → 금색 순서의 성장 단계 색상 (진행바 세그먼트에 사용)
export const STAGE_COLORS = ['#f3a6b0', '#b6c1c8', '#e9ba4e'];

export type StageAsset = {
  source: any;
  ratio: number; // width / height (트리밍된 실제 이미지 기준)
  width: number; // 렌더링 기준 폭(px)
};

// assets/pig의 PNG들은 배경을 제거하고 투명 여백을 트리밍해서, 이미지 프레임의 맨 아래 = 돼지 발이 닿는 바닥선이 되도록 맞춰뒀다.
// 각 단계 컨테이너를 화면에서 bottom 정렬만 해주면 단계가 바뀌어도 접지선이 항상 동일하게 유지된다.
// require()는 정적 문자열이어야 해서 여기서 직접 명시
export const STAGE_ASSETS: Record<number, StageAsset> = {
  0: { source: require('../../assets/pig/pig1.png'), ratio: 1000 / 982, width: 190 },
  1: { source: require('../../assets/pig/pig2.png'), ratio: 1000 / 959, width: 220 },
  2: { source: require('../../assets/pig/pig3.png'), ratio: 1000 / 959, width: 250 },
};

export const stageForTotal = (total: number): number => {
  let stage = 0;
  for (let i = 0; i < STAGE_THRESHOLDS.length; i++) {
    if (total >= STAGE_THRESHOLDS[i]) stage = i;
  }
  return stage;
};

export const countHintForStage = (stage: number): string => {
  const hints = ['0~4개', '5~14개', '15개 이상'];
  return hints[stage] ?? hints[hints.length - 1];
};
