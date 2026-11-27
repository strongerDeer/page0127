/**
 * 연말 응원 문장 목록 — 선물 상자를 풀면 이 중 한 줄이 나온다.
 *
 * 저작권: 세상을 떠난 지 70년이 지나 보호 기간이 끝난 작가의 작품만 싣는다
 * (2026년 기준 1955년 이전에 세상을 떠난 작가). 새 문장을 넣을 때도 이 규칙을 지킨다.
 *
 * 왜 코드 파일인가(HJ 2026-11-27, 1번 A): 12월 한 달만 쓰는 고정 목록이라 DB·어드민을 만들 일이 아니다.
 * 받은 문장은 DB(year_cheers)에 열쇠(id)로 남으므로 — 2번 B —
 *   - 문장을 **더 넣는 것**은 언제든 괜찮다(이미 받은 사람은 그대로).
 *   - 이미 있는 문장의 **id 를 바꾸거나 지우면 안 된다** — 받은 사람 카드가 비게 된다.
 *     (sentences.test.ts 가 id 모양·중복을 지킨다)
 *
 * 표기: 맞춤법은 요즘 교과서·전집에서 널리 쓰는 현대 표기를 따른다. 줄바꿈은 시의 행 그대로.
 */

export type CheerSentence = {
  /** 바꾸지 않는 열쇠 — DB 에 저장된다 */
  id: string;
  /** 카드에 그릴 줄들 */
  lines: string[];
  author: string;
  /** 작품명 — 「」로 감싸 출처를 적는다 */
  work: string;
};

export const CHEER_SENTENCES: readonly CheerSentence[] = [
  // ── 윤동주(1917~1945) ──
  {
    id: 'yun-new-road',
    lines: ['어제도 가고', '오늘도 갈', '나의 길 새로운 길'],
    author: '윤동주',
    work: '새로운 길',
  },
  {
    id: 'yun-prologue-star',
    lines: ['별을 노래하는 마음으로', '모든 죽어 가는 것을 사랑해야지'],
    author: '윤동주',
    work: '서시',
  },
  {
    id: 'yun-prologue-road',
    lines: ['그리고 나한테 주어진 길을', '걸어가야겠다.'],
    author: '윤동주',
    work: '서시',
  },
  {
    id: 'yun-seeds',
    lines: ['가진 바 씨앗을', '뿌리면서 가거라.'],
    author: '윤동주',
    work: '눈 감고 간다',
  },
  {
    id: 'yun-handshake',
    lines: [
      '나는 나에게 작은 손을 내밀어',
      '눈물과 위안으로 잡는 최초의 악수.',
    ],
    author: '윤동주',
    work: '쉽게 씌어진 시',
  },
  {
    id: 'yun-counting-stars',
    lines: ['별 하나에 추억과', '별 하나에 사랑과', '별 하나에 쓸쓸함과'],
    author: '윤동주',
    work: '별 헤는 밤',
  },
  {
    id: 'yun-road-lost',
    lines: ['내가 사는 것은, 다만,', '잃은 것을 찾는 까닭입니다.'],
    author: '윤동주',
    work: '길',
  },

  // ── 한용운(1879~1944) ──
  {
    id: 'han-meet-again',
    lines: [
      '우리는 만날 때에 떠날 것을 염려하는 것과 같이',
      '떠날 때에 다시 만날 것을 믿습니다.',
    ],
    author: '한용운',
    work: '님의 침묵',
  },
  {
    id: 'han-ashes',
    lines: ['타고 남은 재가', '다시 기름이 됩니다.'],
    author: '한용운',
    work: '알 수 없어요',
  },
  {
    id: 'han-lamp',
    lines: [
      '그칠 줄을 모르고 타는 나의 가슴은',
      '누구의 밤을 지키는 약한 등불입니까.',
    ],
    author: '한용운',
    work: '알 수 없어요',
  },

  // ── 이육사(1904~1944) ──
  {
    id: 'yuk-plain-seed',
    lines: [
      '지금 눈 내리고',
      '매화 향기 홀로 아득하니',
      '내 여기 가난한 노래의 씨를 뿌려라.',
    ],
    author: '이육사',
    work: '광야',
  },
  {
    id: 'yuk-flower',
    lines: ['비 한 방울 내리잖는 그때에도', '오히려 꽃은 빨갛게 피지 않는가'],
    author: '이육사',
    work: '꽃',
  },
  {
    id: 'yuk-green-grapes',
    lines: ['내 고장 칠월은', '청포도가 익어 가는 시절'],
    author: '이육사',
    work: '청포도',
  },

  // ── 이상(1910~1937) ──
  {
    id: 'yisang-wings',
    lines: ['날개야 다시 돋아라.', '날자. 날자. 날자.', '한 번만 더 날자꾸나.'],
    author: '이상',
    work: '날개',
  },

  // ── 김소월(1902~1934) ──
  {
    id: 'sowol-mountain-flower',
    lines: ['산에는 꽃 피네', '꽃이 피네', '갈 봄 여름 없이', '꽃이 피네'],
    author: '김소월',
    work: '산유화',
  },
  {
    id: 'sowol-riverside',
    lines: ['엄마야 누나야 강변 살자', '뜰에는 반짝이는 금모래 빛'],
    author: '김소월',
    work: '엄마야 누나야',
  },

  // ── 김영랑(1903~1950) ──
  {
    id: 'yeongnang-peony',
    lines: ['모란이 피기까지는', '나는 아직 나의 봄을 기다리고 있을 테요'],
    author: '김영랑',
    work: '모란이 피기까지는',
  },
  {
    id: 'yeongnang-sunlight',
    lines: ['내 마음 고요히 고운 봄 길 위에', '오늘 하루 하늘을 우러르고 싶다'],
    author: '김영랑',
    work: '돌담에 속삭이는 햇발',
  },

  // ── 정지용(1902~1950) ──
  {
    id: 'jiyong-lake',
    lines: ['보고 싶은 마음', '호수만 하니', '눈 감을밖에.'],
    author: '정지용',
    work: '호수',
  },
  {
    id: 'jiyong-nostalgia',
    lines: ['그곳이 차마 꿈엔들', '잊힐 리야.'],
    author: '정지용',
    work: '향수',
  },
];

/** id → 문장. 목록에 없는 id(지워진 문장)면 undefined */
export const findCheerSentence = (id: string): CheerSentence | undefined =>
  CHEER_SENTENCES.find((sentence) => sentence.id === id);

/**
 * 무작위로 한 줄 — 처음 열 때 한 번만 부른다(그 뒤로는 DB 에 남은 id 를 쓴다).
 * random 을 받는 이유: 테스트에서 결과를 고정하려고.
 */
export const pickCheerSentence = (
  random: () => number = Math.random
): CheerSentence => {
  const index = Math.min(
    CHEER_SENTENCES.length - 1,
    Math.floor(random() * CHEER_SENTENCES.length)
  );
  return CHEER_SENTENCES[index];
};
