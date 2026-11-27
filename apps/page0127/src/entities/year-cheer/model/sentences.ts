/**
 * 연말 응원 문장 목록 — 선물 상자를 풀면 이 중 한 줄이 나온다.
 *
 * 출처: 서점 베스트·스테디셀러의 「책 속에서」(출판사가 책 소개에 공개한 문장)에서
 * HJ가 확인 페이지로 직접 고른 29개(2026-11-27). 문장은 책에 나온 글자 그대로이고,
 * 길면 앞뒤를 잘라 한 부분만 쓴다. 번역서는 실제 한국어판 번역과 옮긴이를 적는다.
 * 한 작가에 한 문장이 기본이다(HJ: "같은 책에서 너무 많이 가져오지 말 것").
 * 권리자가 빼 달라고 하면 그 문장을 빼되, 이미 받은 사람이 있으면 아래 id 규칙을 먼저 볼 것.
 *
 * 왜 코드 파일인가(HJ 2026-11-27, 1번 A): 12월 한 달만 쓰는 고정 목록이라 DB·어드민을 만들 일이 아니다.
 * 받은 문장은 DB(year_cheers)에 열쇠(id)로 남으므로 — 2번 B —
 *   - 문장을 **더 넣는 것**은 언제든 괜찮다(이미 받은 사람은 그대로).
 *   - 12월 1일 공개 뒤에는 이미 있는 문장의 **id 를 바꾸거나 지우면 안 된다** — 받은 사람 카드가 비게 된다.
 *     (yearCheer.test.ts 가 id 모양·중복을 지킨다)
 */

export type CheerSentence = {
  /** 바꾸지 않는 열쇠 — DB 에 저장된다 */
  id: string;
  /** 카드에 그릴 줄들 */
  lines: string[];
  author: string;
  /** 책 제목 — 『』로 감싼다 */
  book: string;
  /** 책 안의 시·글 제목(있을 때만) — 「」로 감싼다 */
  piece?: string;
  /** 번역서의 옮긴이 */
  translator?: string;
};

export const CHEER_SENTENCES: readonly CheerSentence[] = [
  {
    id: 'cheer-01',
    lines: [
      '일어난 일은 바뀌지 않았지만,',
      '그사이에 그 일을 바라보는 나의 시각이 달라졌기 때문이다.',
    ],
    author: '김연수',
    book: '눈 내리는 삼일포',
  },
  {
    id: 'cheer-02',
    lines: ['그때는 실속 없어 보였던 시간들이', '나중에는 내 서사가 된다.'],
    author: '이창현(코유)',
    book: '애매함을 사랑하기',
  },
  {
    id: 'cheer-03',
    lines: [
      '사라졌다고 생각했던 시간은',
      '사실은 어디론가 없어진 것이 아니라,',
      '지금의 나를 이루는 한 부분이 되어',
      '조용히 쌓여 있었습니다.',
    ],
    author: '김정원',
    book: '나의 찬란한 그대에게',
  },
  {
    id: 'cheer-04',
    lines: [
      '그리고 그런 걸 마주한 때라야 비로소 나는',
      '계절이 하는 일과 시간이 맡은 몫을 알 수 있었다.',
    ],
    author: '김애란',
    book: '바깥은 여름',
    piece: '입동',
  },
  {
    id: 'cheer-05',
    lines: [
      '이제는 나이를 한 해 한 해 세는 게 아니라',
      '행복하게 보내는 순간 순간을 세고 있다고?',
    ],
    author: '하이케 팔러',
    book: '100 인생 그림책',
    translator: '김서정',
  },
  {
    id: 'cheer-06',
    lines: [
      '예사로운 아름다움도',
      '살날보다 산 날이 많은 어느 시기와 만나면',
      '깜짝 놀랄 빼어남으로 빛날 수 있다는',
      '신기한 발견을 올해의 행운으로 꼽으며',
      '1982년이여 안녕.',
    ],
    author: '박완서',
    book: '모래알만 한 진실이라도',
    piece: '아름다운 것은 무엇을 남길까',
  },
  {
    id: 'cheer-07',
    lines: [
      '하루하루 비슷해 보여도',
      '어떤 날은 피곤해 죽겠다가',
      '또 어떤 날은 이 맛에 사는 거지 싶어.',
    ],
    author: '일홍',
    book: '행복할 거야 이래도 되나 싶을 정도로',
  },
  {
    id: 'cheer-08',
    lines: [
      '삶을 잘 살아간다는 건 매번 옳은 선택을 하는 게 아니라',
      '내가 선택한 삶을 조금씩 마음에 드는 모습으로 가꿔가는 일이었다.',
    ],
    author: '선요',
    book: '근거리 행복',
  },
  {
    id: 'cheer-09',
    lines: [
      '여기 남아 내가 할 일:',
      '시 열심히 쓰기, 사랑 열심히 하기, 꿈 열심히 꾸기,',
      '돈 적당히 벌기, 건강 관리 잘하기,',
      '웃긴 생각 많이 하기',
    ],
    author: '고선경',
    book: '심장보다 단단한 토마토 한 알',
    piece: '팬레터─12월 31일',
  },
  {
    id: 'cheer-10',
    lines: [
      '글쎄, 해님과 달님을',
      '삼백예순다섯 개나',
      '공짜로 받았지 뭡니까.',
    ],
    author: '나태주',
    book: '나태주의 매일 첫날 일력',
    piece: '새해 인사',
  },
  {
    id: 'cheer-11',
    lines: [
      '내게 기다려지는 것이 있다면 계절이 바뀌는 것이요,',
      '희망이 있다면 봄을 다시 보는 것이다.',
    ],
    author: '피천득',
    book: '악수도 없이 헤어졌다',
  },
  {
    id: 'cheer-12',
    lines: ['‘하자.’', '그냥 하기만 해도 이미 대단한 인생이다.'],
    author: '김종원',
    book: '100일 습관 노트',
    piece: '동사만 남기는 연습을 하면 삶이 가벼워진다',
  },
  {
    id: 'cheer-13',
    lines: ['날마다 재미있게 살자.', '날마다 가볍게 살자.'],
    author: '박혜란',
    book: '언제 죽어도 좋지만 냉장고가 문제야',
    piece: '여든둥이의 다짐',
  },
  {
    id: 'cheer-14',
    lines: ['그러니 뜻을 캐내려고 애쓰지 마라.', '삶은 농담인 것이다.'],
    author: '은희경',
    book: '새의 선물',
  },
  {
    id: 'cheer-15',
    lines: ['당신, 오늘부터 지나친 걱정은 지나치기로 합니다.'],
    author: '권지은',
    book: '이런 말을 듣고 싶었나 보다',
  },
  {
    id: 'cheer-16',
    lines: [
      '좋은 소설과 좋은 친구들이 있는 삶이라니,',
      '그리고 때로 그 두 가지가 하나가 되기도 한다니,',
      '이보다 더 아름다운 삶이 있을까?',
    ],
    author: '심윤경',
    book: '난독 일기',
    piece: '1일 1 단편 읽기',
  },
  {
    id: 'cheer-17',
    lines: [
      '‘나를 위한’ 일들을 하나씩만 할 수 있다면',
      '그런 날들이 모여 의미 있는 기록이 될 거예요.',
    ],
    author: '김신지',
    book: '오늘부터 300일',
  },
  {
    id: 'cheer-18',
    lines: ['잠시 쉬어가자.', '잠시 쉬어간다고,', '삶이 무너지지 않는다.'],
    author: '라파엘',
    book: '당신은 반드시 잘될 사람',
  },
  {
    id: 'cheer-19',
    lines: ['정말 고생했다.', '혼자서 버텨 내느라 정말 고생 많았겠다.'],
    author: '일홍',
    book: '행복할 거야 이래도 되나 싶을 정도로',
  },
  {
    id: 'cheer-20',
    lines: [
      '나름대로 최선을 다한 셈이다',
      '그렇다면 나 자신을 오히려 칭찬해주고',
      '보듬어 껴안아줄 일이다',
    ],
    author: '나태주',
    book: '너무 잘하려고 애쓰지 마라',
  },
  {
    id: 'cheer-21',
    lines: [
      '아직 해보지 않은 시작들이 있고,',
      '아직 실패해 보지 않은 실패들이 있으며,',
      '아직 만나보지 못한 내가 있다.',
    ],
    author: '이창현(코유)',
    book: '애매함을 사랑하기',
  },
  {
    id: 'cheer-22',
    lines: ['힘들더라도 나는 다만', '최선을 다해 끝과 마주하고 싶을 뿐.'],
    author: '이석원',
    book: '보통의 존재',
    piece: '여행의 시작',
  },
  {
    id: 'cheer-23',
    lines: ['‘끝까지 해내는 것’은', '‘작은 끝맺음’의 연속이다.'],
    author: '이노우에 신파치',
    book: '꾸준함의 기술',
    translator: '지소연',
  },
  {
    id: 'cheer-24',
    lines: [
      '그리고 한 해 동안 수고한 나를 위해',
      '의미 있는 연말 선물을 해보시길 바랍니다.',
    ],
    author: '김익한',
    book: '원 페이지 인문학',
  },
  {
    id: 'cheer-25',
    lines: [
      '핵심은 내가 최선을 다했고',
      '그와 더불어 해야 할 일을',
      '행복하게 잘 마쳤다는 데 있기 때문이다.',
    ],
    author: '손웅정',
    book: '모든 것은 기본에서 시작한다',
    piece: '진짜 중요한 것',
  },
  {
    id: 'cheer-26',
    lines: ['저는 다른 무엇보다', '제 일에 최선을 다할 생각입니다.'],
    author: '빈센트 반 고흐',
    book: '반 고흐, 영혼의 편지',
    translator: '신성림',
  },
  {
    id: 'cheer-27',
    lines: ['설렁설렁 재미있게 깔짝.', '나를 놓치지만 말자.'],
    author: '수풀림',
    book: '꾸준함을 기르는 일',
  },
  {
    id: 'cheer-28',
    lines: [
      '그러니 오늘, 그리고 모든 서늘한 날들에',
      '우리 쾌활하게 살아가야지,',
    ],
    author: '메리 올리버',
    book: '천 개의 아침',
    piece: '어둠이 짙어져가는 날들에 쓴 시',
    translator: '민승남',
  },
  {
    id: 'cheer-29',
    lines: [
      '나이답게 사는 것이',
      '언제나 엄숙하게 살라는 말이',
      '아님을 알아야 한다.',
    ],
    author: '이근후',
    book: '나는 죽을 때까지 재미있게 살고 싶다',
  },
];

/** 카드 아래 출처 한 줄 — 「정세랑, 『책』」, 「피천득, 『책』 「글」」, 「카뮈, 『책』 · 김화영 옮김」 */
export const toCheerSource = (sentence: CheerSentence): string => {
  let source = `${sentence.author}, 『${sentence.book}』`;
  if (sentence.piece) source += ` 「${sentence.piece}」`;
  if (sentence.translator) source += ` · ${sentence.translator} 옮김`;
  return source;
};

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
