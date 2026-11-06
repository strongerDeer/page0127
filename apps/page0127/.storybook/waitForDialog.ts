import { expect, waitFor, within } from 'storybook/test';

/**
 * Radix가 body의 클릭을 막은 뒤 모달의 pointer-events를 복구할 때까지 기다린다.
 * Chromatic에서는 play가 그 사이에 시작될 수 있어 DOM의 존재만으로는 부족하다.
 * 포인터 검사를 끄지 않고 실제로 클릭할 수 있는 상태에서 테스트를 시작한다.
 */
export const waitForDialog = async (canvasElement: HTMLElement) => {
  const page = within(canvasElement.ownerDocument.body);
  const dialog = await page.findByRole('dialog');
  await waitFor(() => {
    expect(dialog).toBeVisible();
    // 초기에는 body에서 auto를 상속할 수도 있다. Radix가 레이어 등록을 마친
    // 뒤 직접 설정하는 auto를 기다려 첫 클릭과 effect 사이의 경합도 막는다.
    expect(dialog.style.pointerEvents).toBe('auto');
  });
  return page;
};
