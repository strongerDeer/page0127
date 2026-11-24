/**
 * 서재 상단 배너(LibraryFeatureBanner) 주인용 설명 한 줄.
 *
 * 남은 횟수는 예전엔 분석 버튼 글자("다시 분석 (3/3 남음)")에 들어 있었다.
 * 배너에선 버튼을 짧게 두고 설명 줄로 옮긴다.
 */
type TasteBannerInput = {
  /** 5권(평가한 완독 책)이 모여 분석을 쓸 수 있는지 */
  unlocked: boolean;
  /** 5권까지 남은 권수 — unlocked 면 무시 */
  booksToUnlock: number;
  /** 가장 최근 분석 시각(ISO) — 없으면 null */
  lastAnalyzedAt: string | null;
  /** 이번 달 남은 횟수 */
  remaining: number;
  /** "평가한 완독 책" 같은 책 이름표 */
  bookLabel: string;
};

/**
 * 서버(UTC)와 브라우저(KST)가 같은 날짜를 그리도록 한국 시간으로 고정한다 —
 * 밤 9시 이후 분석은 UTC 로 하루 전이라 그대로 두면 하이드레이션 글자가 어긋난다.
 */
const monthDay = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
});

export const toTasteBannerDescription = ({
  unlocked,
  booksToUnlock,
  lastAnalyzedAt,
  remaining,
  bookLabel,
}: TasteBannerInput): string => {
  if (!unlocked) {
    return `${bookLabel}이 ${booksToUnlock}권 더 모이면 볼 수 있어요`;
  }
  const left = `이번 달 ${remaining}번 남음`;
  if (lastAnalyzedAt) {
    const d = new Date(lastAnalyzedAt);
    if (!Number.isNaN(d.getTime())) {
      return `${monthDay.format(d)} 분석 · ${left}`;
    }
  }
  return `${bookLabel}으로 독서 성향을 읽어 줘요 · ${left}`;
};
