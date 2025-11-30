/**
 * Prettier 설정
 *
 * 학습 포인트:
 * - Prettier는 코드 포매팅만 담당 (들여쓰기, 세미콜론, 따옴표 등)
 * - Import 정렬은 ESLint의 simple-import-sort가 담당
 * - .prettierrc.js를 사용하는 이유: CommonJS 모듈 시스템으로 설정 관리
 */
module.exports = {
  // ========================================
  // 기본 포매팅 규칙
  // ========================================
  semi: true, // 세미콜론 사용
  singleQuote: true, // 작은따옴표 사용 (문자열)
  jsxSingleQuote: true, // 작은따옴표 사용 (JSX)
  tabWidth: 2, // 들여쓰기 2칸
  trailingComma: 'es5', // ES5에서 허용되는 곳에만 trailing comma
  printWidth: 80, // 한 줄 최대 80자
  arrowParens: 'always', // 화살표 함수 매개변수 괄호 항상 사용
  endOfLine: 'lf', // 줄바꿈 문자 (Unix 스타일)
  bracketSpacing: true, // 객체 리터럴 괄호 공백 { foo: bar }
  useTabs: false, // 탭 대신 스페이스 사용
  bracketSameLine: false, // JSX 닫는 괄호 다음 줄

  // ========================================
  // 파일별 포매팅 오버라이드
  // ========================================
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always',
      },
    },
    {
      files: '*.{css,scss}',
      options: {
        singleQuote: false, // CSS는 큰따옴표 사용
        tabWidth: 2,
      },
    },
  ],
};
