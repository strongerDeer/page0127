import type { StorybookConfig } from '@storybook/nextjs-vite';

/*
  Storybook 설정 — 컴포넌트를 앱과 분리해서 보는 카탈로그.

  framework 로 `@storybook/nextjs-vite` 를 쓰는 이유:
  next/image · next/link · next/navigation 같은 Next 전용 모듈을 Storybook 이
  자동으로 대체(mock)해 준다. 순수 react-vite 로 붙이면 이것들이 전부 터진다.
*/
const config: StorybookConfig = {
  // 스토리는 컴포넌트 옆에 둔다(콜로케이션) — 파일을 옮길 때 같이 따라온다.
  stories: ['../src/**/*.stories.@(ts|tsx)', '../src/**/*.mdx'],

  addons: [
    '@storybook/addon-docs', // Props 표·MDX 문서 자동 생성
    '@storybook/addon-a11y', // 접근성 위반 자동 검사 (색 대비·aria 등)
    '@storybook/addon-vitest', // 스토리를 테스트로 실행 — a11y 회귀를 CI 에서 막는다
  ],

  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },

  // public/ 의 이미지를 스토리에서도 같은 경로로 쓸 수 있게 한다.
  staticDirs: ['../public'],

  typescript: {
    // Props 표를 tsconfig 타입에서 뽑아낸다.
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      // React 기본 HTML 속성(onClick, className …)까지 표에 나오면
      // 정작 봐야 할 우리 prop 이 묻힌다 — node_modules 출처는 걸러낸다.
      propFilter: (prop) =>
        prop.parent ? !prop.parent.fileName.includes('node_modules') : true,
    },
  },
};

export default config;
