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
    // 접근성 위반은 테스트 실패다.
    //
    // 'todo'(보고만 함)로 시작해 자주 쓰는 컴포넌트에 스토리가 다 깔린 뒤 올렸다.
    // `npm run test:storybook` 이 모든 스토리를 실제 Chromium 에서 렌더하고 axe 를
    // 돌리므로, 이제 접근성 회귀가 CI 에서 막힌다.
    //
    // ⚠️ 자동 검사는 바닥이지 천장이 아니다. axe 가 잡는 건 "명백한 위반"뿐이고
    // <div> 로 만든 제목, 아무 말 없는 로딩 상태처럼 실제로 문제가 되는 것들은
    // 안 잡힌다 — 그건 여전히 사람이 문서로 채워야 한다.
    a11y: { test: 'error' },
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
