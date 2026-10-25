import type { Book } from '@/entities/book';

/** 공급자 분류를 우선 사용하되, 대분류만 저장된 기존 기록은 작품 단위로 보완한다. */
export const isClassicCategory = (category: string | null) =>
  (category ?? '')
    .split('>')
    .some((part) =>
      /^(?:(?:한국|동양|서양|세계)?고전(?:문학|소설)?|classics)$/i.test(
        part.trim()
      )
    );

// 출간연도는 번역본/재판의 날짜라 작품의 고전 여부를 판정하는 근거로 쓰지 않는다.
// 세계문학전집이라는 문구만으로도 판정하지 않는다(현대 작품이 섞여 있다).
// 대표 작품은 제목과 저자를 함께 확인한다. 같은 제목의 다른 책·해설서는 제외한다.
// 출판사 서지 참고: https://minumsa.com/booklist-download/
const CLASSIC_WORKS = [
  { titles: ['이방인', '페스트'], authors: ['카뮈', '까뮈', 'camus'] },
  {
    titles: ['호밀밭의 파수꾼'],
    authors: ['샐린저', '샐린져', '셀린저', 'salinger'],
  },
  { titles: ['동물농장', '1984', '1984년'], authors: ['오웰', 'orwell'] },
  {
    titles: ['데미안', '싯다르타', '수레바퀴 아래서', '황야의 이리'],
    authors: ['헤세', 'hesse'],
  },
  { titles: ['변신', '심판', '소송', '성'], authors: ['카프카', 'kafka'] },
  {
    titles: ['노인과 바다', '무기여 잘 있거라'],
    authors: ['헤밍웨이', 'hemingway'],
  },
  { titles: ['위대한 개츠비'], authors: ['피츠제럴드', 'fitzgerald'] },
  { titles: ['오만과 편견', '이성과 감성'], authors: ['오스틴', 'austen'] },
  {
    titles: ['어린 왕자'],
    authors: ['생텍쥐페리', '생텍쥐베리', 'saintexupery', 'saintexupéry'],
  },
  { titles: ['인간 실격', '사양'], authors: ['다자이', 'dazai'] },
  {
    titles: ['죄와 벌', '카라마조프가의 형제들', '카라마조프 가의 형제들'],
    authors: ['도스토옙스키', '도스토예프스키', 'dostoevsky'],
  },
  { titles: ['멋진 신세계'], authors: ['헉슬리', 'huxley'] },
] as const;

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export const isClassicBook = (
  book: Pick<Book, 'title' | 'author' | 'category'>
) => {
  if (isClassicCategory(book.category)) return true;
  if (!book.author) return false;
  // 판본 표기만 제거한다. '이방인 해설' 같은 별도 작품을 부분 일치로 인정하지 않는다.
  const title = normalize(
    book.title.replace(/\([^)]*\)|\[[^\]]*\]/g, '').split(/\s+[-–—:]\s+/)[0]!
  );
  const author = normalize(book.author.split(/[,，]/)[0]!);
  return CLASSIC_WORKS.some(
    (work) =>
      work.titles.some((alias) => normalize(alias) === title) &&
      work.authors.some((alias) => author.includes(normalize(alias)))
  );
};
