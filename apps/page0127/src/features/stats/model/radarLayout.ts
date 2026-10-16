/**
 * 이보다 좁은 칸(모바일 카드)에선 이름을 줄인다.
 * 데스크톱 균형 카드의 레이더 칸이 딱 360px(md:grid-cols-[360px_1fr])이라 그보다 작게 —
 * 큰 폰(430px 화면)의 카드 안쪽도 약 350px 라 짧은 쪽에 든다
 */
const NARROW_WIDTH = 360;

type RadarLayout = {
  /** 축 라벨 — 좁으면 '예술/대중문화' → '예술' */
  label: (category: string) => string;
  margin: { top: number; right: number; bottom: number; left: number };
};

/**
 * 레이더 크기는 폭이 정한다 — 좌우 여백(긴 라벨 자리)을 빼고 남은 폭으로 그린다.
 * 모바일 카드(약 280~310px)에서 여백 52px×2 를 두면 레이더가 지름 130px 남짓으로 작아졌다.
 * 좁으면 라벨을 앞부분만 남기고(띠 라벨과 같은 규칙) 여백을 줄여 레이더를 키운다.
 * 폭을 아직 모르면(0, 첫 측정 전) 넓은 쪽으로 둔다.
 */
export const radarLayout = (width: number): RadarLayout => {
  const narrow = width > 0 && width < NARROW_WIDTH;
  const side = narrow ? 28 : 52;
  return {
    label: narrow
      ? (category) => category.split('/')[0]
      : (category) => category,
    margin: { top: 24, right: side, bottom: 24, left: side },
  };
};
