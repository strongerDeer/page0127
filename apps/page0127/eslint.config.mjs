import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

/**
 * ESLint 설정 (Next.js 16 Flat Config)
 *
 * 학습 포인트:
 * - Prettier와 충돌하지 않도록 포매팅 규칙 제외
 * - import 순서 자동 정렬: React → Next.js → 외부 라이브러리 → 내부 모듈 (FSD 순서)
 * - React 함수 컴포넌트는 화살표 함수 사용 (실무 표준)
 * - TypeScript type 일관성 강제
 * - Named Export 사용 (Default Export 금지)
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Import 정렬 플러그인
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      import: importPlugin,
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
    'src/shared/ui/**', // shadcn/ui 컴포넌트 제외 (외부 라이브러리 코드)
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
      // target="_blank" 보안 규칙 (rel="noopener noreferrer" 자동 강제)
      'react/jsx-no-target-blank': [
        'error',
        {
          enforceDynamicLinks: 'always',
        },
      ],
      // Hooks 규칙 (react-hooks 플러그인에서 자동 적용)
      // setState in effect를 경고로 낮춤 (특정 케이스에서 필요할 수 있음)
      'react-hooks/set-state-in-effect': 'warn',

      // Named Export 사용 (Default Export 금지)
      // 단, Next.js 특수 파일(page.tsx, layout.tsx 등)은 예외
      'import/no-default-export': 'error', // 기본 error, Next.js 특수 파일만 예외

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
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // debugger 금지
      'no-debugger': 'error',
      // var 금지
      'no-var': 'error',
      // const 우선
      'prefer-const': 'warn',

      // ========================================
      // FSD 아키텍처 규칙
      // ========================================
      // FSD 레이어 간 import 경계 강제
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // shared는 다른 레이어에서 import 불가
            {
              target: './src/shared/**/*',
              from: './src/entities/**/*',
              message: 'shared 레이어는 entities를 import할 수 없습니다.',
            },
            {
              target: './src/shared/**/*',
              from: './src/features/**/*',
              message: 'shared 레이어는 features를 import할 수 없습니다.',
            },
            {
              target: './src/shared/**/*',
              from: './src/widgets/**/*',
              message: 'shared 레이어는 widgets를 import할 수 없습니다.',
            },
            // entities는 features 이상 레이어 import 불가
            {
              target: './src/entities/**/*',
              from: './src/features/**/*',
              message: 'entities 레이어는 features를 import할 수 없습니다.',
            },
            {
              target: './src/entities/**/*',
              from: './src/widgets/**/*',
              message: 'entities 레이어는 widgets를 import할 수 없습니다.',
            },
            // features는 widgets 이상 레이어 import 불가
            {
              target: './src/features/**/*',
              from: './src/widgets/**/*',
              message: 'features 레이어는 widgets를 import할 수 없습니다.',
            },
          ],
        },
      ],
    },
  },

  // Next.js 특수 파일 및 설정 파일은 Default Export 허용
  {
    files: [
      // Next.js App Router 특수 파일 (src/app과 app 둘 다 지원)
      // src
      'src/app/**/page.tsx',
      'src/app/**/layout.tsx',
      'src/app/**/error.tsx',
      'src/app/**/global-error.tsx',
      'src/app/**/loading.tsx',
      'src/app/**/not-found.tsx',
      'src/app/**/template.tsx',
      'src/app/**/default.tsx',
      'src/app/**/route.ts',

      //app
      'app/**/page.tsx',
      'app/**/layout.tsx',
      'app/**/error.tsx',
      'app/**/global-error.tsx',
      'app/**/loading.tsx',
      'app/**/not-found.tsx',
      'app/**/template.tsx',
      'app/**/default.tsx',
      'app/**/route.ts',

      // Pages Router 파일
      'src/pages/**/*.tsx',
      'src/pages/api/**/*.ts',
      // 설정 파일 (Default Export 필수)
      '*.config.{js,ts,mjs,cjs}',
      'tailwind.config.{js,ts}',
    ],
    rules: {
      'import/no-default-export': 'off',
      // Next.js 특수 파일(error.tsx, not-found.tsx 등)은 function 선언 허용
      'react/function-component-definition': 'off',
    },
  },
]);

export default eslintConfig;
