import type { Preview } from '@storybook/nextjs-vite';

// 앱과 똑같은 스타일 기반 위에서 컴포넌트를 본다.
// globals.css 안에서 Tailwind · 디자인 토큰(라이트/다크) · .heading-* 유틸이
// 전부 로드되므로, 스토리에 보이는 것이 실제 화면과 같아진다.
import '../app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // 접근성 검사는 "보고만" 한다 — 아직 기준선을 못 잡았으므로
    // 위반이 있어도 스토리를 실패시키지 않고 패널에만 띄운다.
    a11y: { test: 'todo' },
    // 배경은 토큰을 그대로 쓴다. 임의의 흰색/회색을 넣으면
    // 다크 모드에서 컴포넌트만 어둡고 배경은 흰 상태가 된다.
    backgrounds: { disable: true },
  },

  // 여백 없이 붙어 있으면 그림자·보더가 잘려 보인다.
  decorators: [
    (Story) => (
      <div className='p-6'>
        <Story />
      </div>
    ),
  ],
};

export default preview;
