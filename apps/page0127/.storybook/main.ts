import type { StorybookConfig } from '@storybook/nextjs-vite';

/*
  Storybook 설정 — 컴포넌트를 앱과 분리해서 보는 카탈로그.

  framework 로 `@storybook/nextjs-vite` 를 쓰는 이유:
  next/image · next/link · next/navigation 같은 Next 전용 모듈을 Storybook 이
  자동으로 대체(mock)해 준다. 순수 react-vite 로 붙이면 이것들이 전부 터진다.
*/
const config: StorybookConfig = {
  // 스토리는 컴포넌트 옆에 둔다(콜로케이션) — 파일을 옮길 때 같이 따라온다.
  //
  // 디자인 시스템 컴포넌트는 packages/ui 에 산다. node_modules/@repo/ui 가
  // 아니라 워크스페이스 실경로로 가리키는 이유: 심링크를 타면 Vite 가 파일을
  // 두 번(실경로·링크경로) 잡아 HMR 이 어긋나고, 아래 propFilter 도 이 경로를
  // node_modules 로 오인한다.
  stories: [
    '../../../packages/ui/src/**/*.stories.@(ts|tsx)',
    '../../../packages/ui/src/**/*.mdx',
    '../src/**/*.stories.@(ts|tsx)',
    '../src/**/*.mdx',
  ],

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
      //
      // ⚠️ 단, @repo/* 는 워크스페이스 패키지라 심링크로 node_modules 아래에도
      // 보인다. 그대로 걸러내면 디자인 시스템 컴포넌트의 Props 표가 통째로
      // 비어 버린다 — 에러 없이 "표만 없는" 형태라 알아채기 어렵다.
      propFilter: (prop) => {
        if (!prop.parent) return true;
        const from = prop.parent.fileName;
        if (from.includes('/packages/ui/') || from.includes('@repo/')) {
          return true;
        }
        return !from.includes('node_modules');
      },
    },
  },
};

export default config;
