import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 목록을 접어 두고 하나를 고르는 컨트롤.
 *
 * ## 라벨은 `htmlFor` 로 그대로 묶인다
 *
 * `SelectTrigger` 는 `<button>` 이고 **button 은 labelable 요소**다. 그래서
 * `<Label htmlFor>` + `<SelectTrigger id>` 조합이 네이티브 `<select>` 와 똑같이 동작한다 —
 * 라벨을 눌러도 포커스가 간다. `aria-labelledby` 를 따로 붙일 필요가 없다.
 *
 * ## 네이티브 `<select>` 와 무엇이 다른가
 *
 * | | 네이티브 | 이 컴포넌트 |
 * | --- | --- | --- |
 * | 모바일 | OS 피커(iOS 휠 등) | 커스텀 드롭다운 |
 * | 폼 참여 | `name` 으로 FormData 자동 수집 | `name` 을 주면 hidden input 이 생긴다 |
 * | 스타일 | 브라우저마다 다름 | 토큰으로 통일, focus-visible 링 있음 |
 * | 옵션 꾸미기 | 거의 불가 | 자유 (아이콘·설명 등) |
 *
 * **`FormData` 를 쓰는 폼이면 `name` 을 반드시 준다.** 제어 상태(`value`/`onValueChange`)로
 * 다루는 폼이라면 필요 없다.
 *
 * ## 언제 쓰지 않나
 *
 * **옵션이 2~3개면 접어 두지 않는 편이 낫다.** 무엇을 고를 수 있는지 바로 보이고
 * 클릭이 한 번 줄어든다 — 라디오나 토글 그룹을 고려한다.
 * Select 는 옵션이 많아 화면을 차지할 때, 또는 값이 이미 정해져 있어 평소엔 결과만
 * 보여주면 될 때 쓴다.
 *
 * ## 키보드
 *
 * 열기는 `Enter`·`Space`·`↑`·`↓`, 이동은 화살표, 선택은 `Enter`, 닫기는 `Esc`.
 * 글자를 입력하면 그 글자로 시작하는 항목으로 점프한다. 전부 Radix 가 해 준다.
 */
const meta = {
  title: 'UI/Select',
  component: Select,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: '제어 모드로 쓸 때. onValueChange 와 함께.',
      table: { category: 'State' },
    },
    defaultValue: {
      control: 'text',
      description: '비제어 모드 초기값.',
      table: { category: 'State' },
    },
    disabled: {
      control: 'boolean',
      description: '전체 비활성.',
      table: { category: 'State', defaultValue: { summary: 'false' } },
    },
    name: {
      control: 'text',
      description:
        'FormData 를 쓰는 폼에서 필수. hidden input 이 생겨 제출에 참여한다.',
      table: { category: 'Form' },
    },
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 라벨과 묶은 기본형. 라벨을 눌러도 열린다.
 *
 * `play` 로 **열기 → 고르기 → 값 반영**까지 실제로 눌러 본다. 이 상호작용이 CI 에서
 * 검증되므로, Radix 를 업그레이드하다 동작이 깨지면 테스트가 잡는다.
 * (`SelectContent` 는 포털로 `body` 에 렌더되므로 스토리 루트가 아니라 `screen` 에서 찾는다)
 */
export const WithLabel: Story = {
  render: () => (
    <div className='w-64 space-y-2'>
      <Label htmlFor='status'>독서 상태</Label>
      <Select defaultValue='completed'>
        <SelectTrigger id='status' className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='completed'>완독</SelectItem>
          <SelectItem value='reading'>읽는 중</SelectItem>
          <SelectItem value='want_to_read'>읽고 싶은 책</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('combobox');
    await expect(trigger).toHaveTextContent('완독');

    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole('option', { name: '읽는 중' }));

    await expect(trigger).toHaveTextContent('읽는 중');

    // 목록이 완전히 걷힐 때까지 기다린다. Radix 는 닫히면서 배경에 씌운
    // `aria-hidden` 래퍼를 정리하는데, 그 전에 a11y 검사가 돌면 "aria-hidden 안에
    // 포커스 가능한 요소가 있다"로 잡힌다 — 실제 결함이 아니라 검사 타이밍 문제다.
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    await waitFor(() =>
      expect(document.querySelector('[data-aria-hidden="true"]')).toBeNull()
    );
  },
};

/** 아직 고르지 않은 상태 — `placeholder` 가 보인다. */
export const Placeholder: Story = {
  render: () => (
    <div className='w-64 space-y-2'>
      <Label htmlFor='sort'>정렬</Label>
      <Select>
        <SelectTrigger id='sort' className='w-full'>
          <SelectValue placeholder='정렬 선택' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='created_at-desc'>최신순</SelectItem>
          <SelectItem value='created_at-asc'>오래된순</SelectItem>
          <SelectItem value='rating-desc'>별점 높은순</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

/*
  **열린 채로 멈춘 스토리는 만들 수 없다.**

  Radix Select 가 열리면 배경 요소를 `aria-hidden="true"` 로 감싸는데, 그 안에 trigger
  버튼이 포커스 가능한 채로 남는다 → axe 가 `aria-hidden-focus` 위반으로 잡는다.
  `open` prop 으로 강제로 열든 `play` 로 실제 클릭해서 열어 두든 결과가 같았다.
  라이브러리 구조에서 오는 것이라 우리 코드로는 고칠 수 없다.

  대신 위 `WithLabel` 처럼 **열었다가 닫는 것**은 된다 — 닫히면 Radix 가 그 래퍼를
  정리하므로 `waitFor` 로 정리를 기다린 뒤 검사하면 통과한다. 그래서 열린 모습을 정적
  스토리로 굳히는 대신, 상호작용 테스트로 "열리고 골라지는지"를 검증하는 쪽을 택했다.
  화면으로 보고 싶으면 Storybook 에서 직접 클릭하면 된다.

  이 판단을 뒤집으려면(열린 스토리가 꼭 필요하면): 키보드로 Tab 했을 때 배경 trigger 로
  나가지 않는지 먼저 확인하고, 문제가 없다면 `parameters.a11y.config.rules` 로
  그 스토리에만 `aria-hidden-focus` 를 끈다. 게이트에 예외를 만드는 일이니 근거를 남길 것.
*/

/**
 * 옵션이 많을 때 묶어서 보여준다. `SelectLabel` 은 고를 수 없는 제목이고
 * `SelectSeparator` 로 무리를 나눈다.
 */
export const Grouped: Story = {
  render: () => (
    <div className='w-64 space-y-2'>
      <Label htmlFor='grouped'>정렬</Label>
      <Select defaultValue='created_at-desc'>
        <SelectTrigger id='grouped' className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>기록 시각</SelectLabel>
            <SelectItem value='created_at-desc'>최신순</SelectItem>
            <SelectItem value='created_at-asc'>오래된순</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>평점</SelectLabel>
            <SelectItem value='rating-desc'>별점 높은순</SelectItem>
            <SelectItem value='rating-asc'>별점 낮은순</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
};

/** 비활성. 개별 항목만 비활성으로 둘 수도 있다. */
export const Disabled: Story = {
  render: () => (
    <div className='w-64 space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='disabled-all'>전체 비활성</Label>
        <Select defaultValue='completed' disabled>
          <SelectTrigger id='disabled-all' className='w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='completed'>완독</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className='text-xs text-text-subtle'>
        개별 항목은 <code>&lt;SelectItem disabled&gt;</code> 로 막는다 — 목록에는
        보이지만 고를 수 없다.
      </p>
    </div>
  ),
};

/**
 * 실제 화면 한 조각 — 책 기록 폼의 독서 상태.
 * 같은 폼의 Label·Input 과 높이·테두리가 맞는다.
 */
export const RealWorld: Story = {
  render: () => (
    <form className='w-80 space-y-4 rounded-lg border border-line bg-card p-5'>
      <div>
        <p className='text-base font-medium text-text-strong'>아무튼, 계속</p>
        <p className='mt-0.5 text-sm text-text-subtle'>김미소 · 코난북스</p>
      </div>
      <div className='space-y-2'>
        <Label htmlFor='rw-status'>독서 상태 *</Label>
        <Select defaultValue='completed'>
          <SelectTrigger id='rw-status' className='w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='completed'>완독</SelectItem>
            <SelectItem value='reading'>읽는 중</SelectItem>
            <SelectItem value='want_to_read'>읽고 싶은 책</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </form>
  ),
};
