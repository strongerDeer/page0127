import { renderToStaticMarkup } from 'react-dom/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventSubmitButton } from './EventSubmitButton';

// useFormStatus 는 부모 form 의 제출 상태를 읽는 훅 — 테스트에선 pending 값만 바꿔 끼운다
const formStatus = vi.hoisted(() => ({ pending: false }));
vi.mock('react-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-dom')>()),
  useFormStatus: () => formStatus,
}));

describe('EventSubmitButton', () => {
  beforeEach(() => {
    formStatus.pending = false;
  });

  it('평상시엔 눌러서 제출할 수 있다', () => {
    const html = renderToStaticMarkup(<EventSubmitButton />);
    expect(html).toContain('>기록<');
    expect(html).not.toContain('disabled=""');
  });

  it('저장 중에는 잠가서 연타로 두 번 들어가지 않게 한다', () => {
    formStatus.pending = true;
    const html = renderToStaticMarkup(<EventSubmitButton />);
    expect(html).toContain('disabled=""');
    expect(html).toContain('기록 중…');
  });
});
