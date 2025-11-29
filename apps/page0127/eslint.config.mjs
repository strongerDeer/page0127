import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

/**
 * ESLint 설정 (Next.js 16 Flat Config)
 *
 * 학습 포인트:
 * - Prettier와 충돌하지 않도록 포매팅 규칙 제외
 * - import 순서 자동 정렬: React → Next.js → 외부 라이브러리 → 내부 모듈 (FSD 순서)
 * - React 함수 컴포넌트는 화살표 함수 사용 (실무 표준)
 * - TypeScript type 일관성 강제
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Import 정렬 플러그인
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
  },

  // 전역 무시 파일
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    '.turbo/**',
  ]),

  // 커스텀 규칙
  {
    rules: {
      // ========================================
      // React 규칙
      // ========================================
      // 함수 컴포넌트는 화살표 함수 사용 (실무 표준)
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      // React import 자동 감지 (Next.js 13+에서 불필요)
      'react/react-in-jsx-scope': 'off',
      // Props spreading 허용 (shadcn/ui에서 많이 사용)
      'react/jsx-props-no-spreading': 'off',
      // 리스트 렌더링 시 key 필수
      'react/jsx-key': 'error',
      // Hooks 규칙 (react-hooks 플러그인에서 자동 적용)

      // ========================================
      // Import 규칙
      // ========================================
      // Import 자동 정렬 (저장 시 --fix로 자동 수정됨)
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // 1. React 관련
            ['^react', '^react-dom'],
            // 2. Next.js 관련
            ['^next'],
            // 3. 외부 라이브러리 (@로 시작하지만 내부 모듈 아님)
            ['^@?\\w'],
            // 4. 내부 모듈 - FSD 순서
            ['^@/shared'],
            ['^@/entities'],
            ['^@/features'],
            ['^@/widgets'],
            ['^@/app'],
            // 5. 상대 경로
            ['^\\.'],
            // 6. 타입 import
            ['^.+\\u0000$'],
            // 7. 스타일/에셋
            ['^.+\\.s?css$', '^.+\\.(png|jpg|jpeg|gif|svg)$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',

      // 사용하지 않는 import 경고
      'no-unused-vars': 'off', // TypeScript가 처리
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // ========================================
      // TypeScript 규칙
      // ========================================
      // any 타입 경고 (개발 중에는 warn, 배포 시 error)
      '@typescript-eslint/no-explicit-any': 'warn',
      // 빈 인터페이스 허용
      '@typescript-eslint/no-empty-interface': 'off',
      // 명시적 함수 반환 타입 불필요 (TypeScript가 추론)
      '@typescript-eslint/explicit-function-return-type': 'off',
      // interface vs type 일관성 (type 우선)
      '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],

      // ========================================
      // 일반 규칙
      // ========================================
      // console.log 경고 (개발 중에는 허용)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // debugger 금지
      'no-debugger': 'error',
      // var 금지
      'no-var': 'error',
      // const 우선
      'prefer-const': 'warn',
    },
  },
]);

export default eslintConfig;
