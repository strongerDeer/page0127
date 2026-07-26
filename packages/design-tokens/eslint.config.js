import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

/**
 * ESLint 설정 (Design Tokens Package)
 *
 * packages/icons 의 설정과 같은 패턴이다: import 자동 정렬 + TypeScript 규칙.
 * build.mjs 는 플레인 ESM 스크립트지만 같은 파서로 문제없이 파싱된다
 * (타입 정보가 필요한 규칙은 쓰지 않으므로 .ts 와 함께 묶어도 된다).
 */
export default [
  {
    files: ['**/*.ts', '**/*.mjs'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',

      // Import 자동 정렬
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // 1. Node 내장 모듈
            ['^node:'],
            // 2. 외부 라이브러리
            ['^@?\\w'],
            // 3. 상대 경로
            ['^\\.'],
            // 4. 타입 import
            ['^.+\\u0000$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', '.turbo/**'],
  },
];
