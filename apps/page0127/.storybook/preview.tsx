import type { Preview } from '@storybook/nextjs-vite';

// 앱과 똑같은 스타일 기반 위에서 컴포넌트를 본다.
// preview.css 가 globals.css 를 들여오고, 거기에 스토리 파일을 Tailwind 의
// 스캔 범위에 넣는 `@source` 한 줄을 더한다 (없으면 스토리에만 쓰인 임의값
// 클래스가 조용히 빠진다 — 자세한 사정은 preview.css 주석 참고).
import './preview.css';

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
