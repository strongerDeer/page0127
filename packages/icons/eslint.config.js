import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

/**
 * ESLint 설정 (Icons Package)
 *
 * 학습 포인트:
 * - import 순서 자동 정렬
 * - TypeScript 타입 체크
 * - Named Export 사용 강제
 */
export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
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
            // 1. React 관련
            ['^react'],
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

      // Named Export 사용 강제
      'import/no-default-export': 'error',
    },
  },
  {
    // index.ts는 default export 허용
    files: ['index.ts'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', '.turbo/**'],
  },
];
