import {
  SERVICE_DEFINITION,
  SERVICE_FACTS,
  SERVICE_FAQ,
  SERVICE_FEATURES,
  SERVICE_NAME,
} from './serviceIntro';

/**
 * llms.txt 본문 만들기 — route.ts 에 두지 않는 이유:
 * Next.js 는 라우트 파일에서 GET·dynamic 같은 정해진 이름만 export 하게 검사한다.
 * 순수 함수로 빼 두면 테스트도 쉽다.
 */
export const buildLlmsTxt = (baseUrl: string) =>
  [
    `# ${SERVICE_NAME}`,
    '',
    `> ${SERVICE_DEFINITION}`,
    '',
    ...SERVICE_FACTS.map((f) => `- ${f.label}: ${f.value} (${f.note})`),
    '',
    '## 주요 기능',
    '',
    ...SERVICE_FEATURES.map((f) => `- ${f.title}: ${f.description}`),
    '',
    '## 자주 묻는 질문',
    '',
    ...SERVICE_FAQ.flatMap((f) => [`### ${f.question}`, '', f.answer, '']),
    '## 페이지',
    '',
    `- [서비스 소개](${baseUrl}/about): 기능과 자주 묻는 질문`,
    `- [전체 도서](${baseUrl}/books/all): 가입 없이 보는 등록된 책 목록과 책 정보`,
    `- [공지·업데이트](${baseUrl}/updates): 새로 생긴 기능을 날짜순으로 정리`,
    `- [문의](${baseUrl}/contact): 카카오톡 문의 창구`,
    '',
  ].join('\n');
