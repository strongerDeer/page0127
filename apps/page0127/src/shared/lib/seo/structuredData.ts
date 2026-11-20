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

// <script> 안에 넣을 문자열로 직렬화한다.
// `<`를 유니코드 이스케이프로 바꾸는 이유: 값에 `</script>`가 섞이면 태그가 거기서 닫힌다.
// JSON 파서는 <를 다시 `<`로 읽으므로 데이터 자체는 그대로다. (Next.js 공식 가이드 방식)
export const serializeJsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, '\\u003c');
