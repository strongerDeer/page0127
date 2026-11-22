import type { StoryMeta } from '@/entities/story/model/types';

/**
 * 대온실 수리 보고서 — 첫 번째 책 이야기 (2026-11 HJ)
 *
 * 스포일러 없이 초반 설정만 담는다(인물의 정체·결말은 빼기로 HJ 결정).
 * 그림을 바꾸면 characters 도 그림과 같은 내용으로 맞춘다 — 검색엔진은 그림 속 글자를 잘 못 읽는다.
 *
 * 독후감은 같은 폴더 index.mdx 에 일반 게시글처럼 쓴다.
 * - 문단은 빈 줄로 나눈다. ## 는 소제목.
 * - 책 속 문장은 > 로 짧게 인용하고 쪽수를 붙인다.
 * - 결말·인물의 정체는 쓰지 않는다(스포일러 없음).
 * 지금 있는 두 문단은 관계도 읽는 법 안내 — 그대로 둬도, 지워도 된다.
 */
export const daeonsil: StoryMeta = {
  slug: 'daeonsil-repair-report',
  title: '대온실 수리 보고서 독후감과 인물관계도',
  description:
    '김금희 장편소설 『대온실 수리 보고서』 인물관계도. 2023년 대온실 수리 현장, 2003년 낙원하숙, 1909년 기록 속 사람들과 작품 속 동화까지 스포일러 없이 정리했어요.',
  bookId: '2685df6a-7c49-4fb2-8bb0-2837665827ac',
  bookTitle: '대온실 수리 보고서',
  author: '김금희',
  // HJ 별점 — 0 이면 화면에 별점을 그리지 않는다
  rating: 0,
  publishedAt: '2026-11-23',
  characterMap: {
    full: {
      src: '/images/stories/daeonsil/character-map.webp',
      width: 1024,
      height: 1536,
      alt: '대온실 수리 보고서 인물관계도 — 강영두를 중심으로 현재(2023), 낙원하숙(2003), 과거 기록(1909년부터), 작품 속 동화의 인물들',
    },
    // 모바일용 4:5 카드 — HJ 가 따로 만들면 채운다(인스타 캐러셀과 같은 그림)
    cards: [],
  },
  characters: [
    {
      name: '현재 · 2023',
      people: [
        { name: '강영두', role: '대온실 수리 보고서를 쓰는 사람' },
        { name: '은혜', role: '영두의 소꿉친구 · 공인중개사' },
        { name: '산아', role: '은혜의 딸 · 초등학생, 어린이 회장' },
        { name: '스미', role: '산아와 같은 반' },
        { name: '오태양', role: '산아와 같은 반' },
      ],
    },
    {
      name: '바위건축사사무소',
      people: [
        { name: '연희', role: '사무소 소장' },
        { name: '소목수', role: '사무소 동업자' },
        { name: '은세창', role: '대리 · 작도' },
        { name: '제갈도희', role: '디자이너 · 제도' },
      ],
    },
    {
      name: '동궐관리청',
      people: [
        { name: '장과장', role: '과장' },
        { name: '왕주웅', role: '주무관' },
        { name: '오아랑', role: '학예연구사' },
      ],
    },
    {
      name: '낙원하숙 · 2003',
      people: [
        { name: '안문자', role: '낙원하숙 주인 · 영두가 하숙한 집' },
        { name: '리사', role: '안문자의 손녀 · 하숙생' },
        { name: '딩 아주머니', role: '하숙집 살림' },
        { name: '유화 언니', role: '연극하는 하숙생' },
        { name: '삼우씨', role: '법대생 하숙생' },
        { name: '이순신', role: '뒷집 공고생 · 영두의 첫사랑' },
        { name: '안나', role: '영두의 학교 친구' },
        { name: '빽', role: '영두의 학교 친구 · 전교 1등' },
      ],
    },
    {
      name: '과거 기록 · 1909년부터',
      people: [
        { name: '후쿠다 노보루', role: '대온실 공사 책임자' },
        { name: '기노시타 코주', role: '식물원 책임자' },
        { name: '가마야마 마사시', role: '대온실 관리자 · 기노시타의 상관' },
      ],
    },
    {
      name: '작품 속 동화 「배고픈 쿠마 센세이」',
      people: [
        { name: '마리코 히메', role: '동화 속 화자' },
        { name: '쿠마 센세이', role: '곰 선생님' },
        { name: '빨간 등', role: '원숭이' },
        { name: '고무장화', role: '사육사' },
        { name: '조류 박사', role: '원장' },
        { name: '오니아이', role: '식물원 · 동물원 대장' },
      ],
    },
  ],
};
