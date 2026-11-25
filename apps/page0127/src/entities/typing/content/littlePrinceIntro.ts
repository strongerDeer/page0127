/**
 * 『어린 왕자』 필사 페이지의 책 소개 · 자주 묻는 질문
 *
 * 화면과 구조화 데이터(JSON-LD)가 같은 배열을 받는다 — 화면에 없는 FAQ 를 JSON-LD 에만 넣으면
 * 검색엔진 정책 위반이라서다. 문장은 모두 page0127.이 직접 썼다(출판사·서점 소개 문구 X).
 */

export const LITTLE_PRINCE_FACTS: { label: string; value: string }[] = [
  { label: '지은이', value: '앙투안 드 생텍쥐페리' },
  { label: '처음 나온 해', value: '1943년, 미국 뉴욕' },
  { label: '원래 언어', value: '프랑스어' },
  { label: '분량', value: '27장 · 짧은 장편 동화' },
];

export const LITTLE_PRINCE_INTRO =
  '사막에 불시착한 비행사가 아주 작은 별에서 온 어린 왕자를 만나는 이야기예요. 어린이 책처럼 보이지만 어른이 되면서 잊어버린 것들을 묻는 책이라, 문장이 짧고 쉬워서 처음 필사하기에도 좋아요.';

/** 서점 링크(YES24) — HJ가 고른 판본 주소. 비어 있으면 버튼을 숨긴다 */
export const LITTLE_PRINCE_STORE_URL: string | null = null;

/** "내 서재에 담기"에 쓰는 판본 ISBN — 위 서점 링크와 같은 판본. 비어 있으면 버튼을 숨긴다 */
export const LITTLE_PRINCE_ISBN: string | null = null;

export const LITTLE_PRINCE_FAQ: { question: string; answer: string }[] = [
  {
    question: '온라인 필사는 어떻게 하나요?',
    answer:
      '파란 글씨로 보이는 본문 바로 아래에 똑같이 따라 치면 돼요. 한 쪽을 끝까지 쓰면 타수와 정확도가 나오고 다음 쪽으로 넘어가요. 처음부터 이어 쓰기, 장 고르기, 명문장만 쓰기 중에서 고를 수 있어요.',
  },
  {
    question: '한글 타자 연습으로도 쓸 수 있나요?',
    answer:
      '네. 긴 글 타자 연습처럼 1분에 몇 타를 쳤는지(타수)와 정확도를 보여 줘요. 타수는 한글 자판을 누른 횟수로 세요. 받침이 있으면 한 타가 더 붙고, 겹받침과 이중모음은 2타예요.',
  },
  {
    question: '로그인하지 않아도 쓸 수 있나요?',
    answer:
      '로그인하지 않아도 바로 따라 쳐 볼 수 있어요. 다만 다 쓴 쪽, 진행도, 랭킹 기록은 로그인한 계정에만 남아요.',
  },
  {
    question: '나머지 장은 언제 열리나요?',
    answer:
      '전체 27장 중 지금은 1~6장을 열어 두었어요. 준비되는 대로 차례로 열어요.',
  },
];
