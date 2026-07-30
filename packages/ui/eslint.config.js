import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

/**
 * ESLint 설정 (@repo/ui)
 *
 * packages/design-tokens 설정과 같은 뼈대에 React 규칙만 얹었다.
 * 앱(eslint-config-next)과 달리 Next 전용 규칙은 넣지 않는다 —
 * 이 패키지는 Next 에 의존하지 않아야 하고, 그 사실을 린트가 지켜 준다.
 */
export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'simple-import-sort': simpleImportSort,
      'react-hooks': reactHooks,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],

      'no-console': ['warn', { allow: ['warn', 'error'] }],

      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // 1. React
            ['^react$', '^react-dom'],
            // 2. 외부 라이브러리
            ['^@?\\w'],
            // 3. 상대 경로
            ['^\\.'],
            // 4. 타입 import
            ['^.+\\u0000$'],
            // 5. 스타일
            ['^.+\\.css$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },
  {
    ignores: ['node_modules/**', '.turbo/**'],
  },
];
