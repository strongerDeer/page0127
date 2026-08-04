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
    ignores: [
      'node_modules/**',
      '.turbo/**',
      // shadcn/ui 원본 컴포넌트는 검사하지 않는다 — 우리가 쓴 코드가 아니라
      // CLI 가 찍어낸 것이고, 규칙에 맞추려 손대면 다음 업스트림 갱신 때마다
      // 그 수정을 다시 해야 한다.
      //
      // 경계는 파일명이다(앱에서 쓰던 관례를 그대로 가져왔다):
      //   kebab-case(button.tsx)  = shadcn CLI 산출물 → 제외
      //   PascalCase(BookCover.tsx) = 우리가 만든 것   → 검사
      // 새 자체 컴포넌트는 목록에 추가할 필요 없이 이 패턴으로 자동 포함된다.
      //
      // `**` 가 아니라 `**/*` 인 것이 중요하다 — 전자는 디렉터리 자체를 무시해
      // 아래 부정 패턴이 아무 효과가 없다(ESLint flat config 규칙).
      'src/components/**/*',
      '!src/components/[A-Z]*.tsx',
      // 스토리는 누가 만든 컴포넌트를 다루든 우리가 쓴 문서다.
      '!src/components/**/*.stories.tsx',
    ],
  },
];
