/**
 * JSON-LD(구조화 데이터) 헬퍼
 *
 * 학습 포인트:
 * - JSON-LD는 검색엔진에게 "이 페이지가 무엇인지"를 schema.org 어휘로 알려주는 데이터다.
 *   메타 태그가 문장 단위 힌트라면, JSON-LD는 타입(WebSite·Book 등)이 붙은 객체다.
 * - WebSite 스키마는 검색 결과에 "사이트 이름"을 어떻게 보여줄지 판단하는 근거가 된다.
 */

type WebSiteJsonLdInput = {
  name: string;
  url: string;
  description: string;
};

export const buildWebSiteJsonLd = ({
  name,
  url,
  description,
}: WebSiteJsonLdInput) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name,
  url,
  description,
  inLanguage: 'ko-KR',
});

type OrganizationJsonLdInput = {
  name: string;
  url: string;
  logo: string;
  sameAs: readonly string[];
};

/**
 * 사이트를 운영하는 주체(브랜드) 정보.
 *
 * - WebSite가 "이 사이트"라면 Organization은 "이 사이트를 만든 브랜드"다.
 * - sameAs: "이 주소들도 같은 브랜드"라는 선언. 공식 SNS 주소를 넣으면 검색엔진이
 *   사이트와 인스타그램 계정을 같은 엔티티로 묶는 근거가 된다.
 * - sameAs는 Organization(또는 Person)에 붙는 속성이라 WebSite가 아니라 여기에 둔다.
 */
export const buildOrganizationJsonLd = ({
  name,
  url,
  logo,
  sameAs,
}: OrganizationJsonLdInput) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name,
  url,
  logo,
  sameAs: [...sameAs],
});

type WebApplicationJsonLdInput = {
  name: string;
  url: string;
  description: string;
};

/**
 * "이 사이트는 어떤 종류의 서비스인가" — 웹에서 바로 쓰는 앱(WebApplication).
 *
 * - WebSite가 "주소"라면 WebApplication은 "제품"이다. AI 검색이 "독서 기록 앱 추천" 같은
 *   질문에 답할 때 분야·가격·플랫폼을 사실로 집어 갈 수 있게 한다.
 * - offers.price '0' = 무료. 숫자가 아니라 문자열로 두는 것이 schema.org 예시 방식이다.
 * - 별점(aggregateRating)은 넣지 않는다. 실제 리뷰 없이 넣으면 구글 정책 위반이다.
 */
export const buildWebApplicationJsonLd = ({
  name,
  url,
  description,
}: WebApplicationJsonLdInput) => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name,
  url,
  description,
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  browserRequirements: 'Requires JavaScript',
  inLanguage: 'ko-KR',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
});

type FaqItem = { question: string; answer: string };

/**
 * 자주 묻는 질문(FAQPage).
 *
 * - 질문·답이 짝지어진 데이터라 AI가 "무료인가요?" 같은 질문에 그대로 인용하기 좋다.
 * - ⚠️ 화면에 실제로 보이는 질문·답과 같아야 한다(숨긴 FAQ는 정책 위반). 그래서
 *   화면과 이 함수가 같은 배열(serviceIntro.ts)을 받는다.
 */
export const buildFaqPageJsonLd = (items: readonly FaqItem[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
});

type StoryArticleJsonLdInput = {
  title: string;
  description: string;
  url: string;
  /** 관계도 그림이 없는 글은 비운다 */
  image?: string;
  datePublished: string;
  dateModified?: string;
  siteName: string;
  siteUrl: string;
  book: { title: string; author: string; url: string };
};

/**
 * 책 이야기(독후감 + 인물관계도) 한 편 — Article 안에 다루는 책(about: Book)을 단다.
 *
 * - about 의 Book 은 "이 글이 어떤 책에 대한 글인가"를 검색엔진·AI 에 알려 준다.
 *   책 정보 페이지 주소(url)를 함께 넣어 두 페이지가 같은 책이라는 걸 잇는다.
 * - 별점(Review/rating)은 넣지 않는다 — 한 사람의 별점을 리뷰 스니펫으로 올리는 건
 *   자기 사이트 리뷰 정책에 걸릴 수 있다.
 */
export const buildStoryArticleJsonLd = ({
  title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  siteName,
  siteUrl,
  book,
}: StoryArticleJsonLdInput) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  description,
  url,
  ...(image && { image: [image] }),
  datePublished,
  dateModified: dateModified ?? datePublished,
  inLanguage: 'ko-KR',
  author: { '@type': 'Organization', name: siteName, url: siteUrl },
  publisher: { '@type': 'Organization', name: siteName, url: siteUrl },
  about: {
    '@type': 'Book',
    name: book.title,
    author: { '@type': 'Person', name: book.author },
    url: book.url,
  },
});

// <script> 안에 넣을 문자열로 직렬화한다.
// `<`를 유니코드 이스케이프로 바꾸는 이유: 값에 `</script>`가 섞이면 태그가 거기서 닫힌다.
// JSON 파서는 <를 다시 `<`로 읽으므로 데이터 자체는 그대로다. (Next.js 공식 가이드 방식)
export const serializeJsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, '\\u003c');
