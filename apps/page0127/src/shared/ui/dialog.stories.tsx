import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 화면을 덮고 한 가지 일을 시키는 창.
 *
 * ## Dialog 인가 AlertDialog 인가
 *
 * **Dialog 는 닫을 수 있고, AlertDialog 는 선택을 요구한다.**
 * Dialog 는 Esc·바깥 클릭·X 버튼 어느 쪽으로도 그냥 빠져나올 수 있다. 그래서 편집·입력처럼
 * "안 해도 그만"인 일에 쓴다. 삭제·탈퇴처럼 되돌릴 수 없는 일은 `AlertDialog` 를 쓴다.
 *
 * ## DialogTitle 은 생략할 수 없다
 *
 * 없으면 Radix 가 콘솔에 경고를 낸다. 창이 열렸을 때 스크린리더가 **가장 먼저 읽는 것**이
 * 제목이라, 없으면 사용자는 무엇이 열렸는지 모른 채 갇힌다.
 * 시각적으로 제목을 숨기고 싶어도 지우지 말고 `sr-only` 로 감춘다.
 *
 * `DialogDescription` 은 `aria-describedby` 로 연결되어 제목 다음에 읽힌다.
 *
 * ## 열려 있는 동안
 *
 * 포커스가 창 안에 갇히고(Tab 이 밖으로 안 나간다), 뒤 배경은 스크롤이 잠기며,
 * 닫으면 **열기 전에 눌렀던 버튼으로 포커스가 돌아간다.** 전부 Radix 가 해 준다 —
 * 직접 만들면 이 중 하나는 빠뜨리게 된다.
 *
 * ## 창 안에 창을 열지 않는다
 *
 * 두 겹이 되면 Esc 가 어느 것을 닫는지 사용자가 예측할 수 없다. 단계가 필요하면
 * 한 창 안에서 내용을 바꾼다.
 */
const meta = {
  title: 'UI/Dialog',
  component: Dialog,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: '제어 모드로 쓸 때. 안 주면 Trigger 가 알아서 연다.',
      table: { category: 'State' },
    },
    defaultOpen: {
      control: 'boolean',
      description: '처음부터 열린 채로 시작할지.',
      table: { category: 'State', defaultValue: { summary: 'false' } },
    },
    modal: {
      control: 'boolean',
      description:
        'false 면 뒤 배경과 상호작용할 수 있다. 거의 항상 기본값(true)을 쓴다.',
      table: { category: 'State', defaultValue: { summary: 'true' } },
    },
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — 버튼을 누르면 열린다. Esc · 바깥 클릭 · X 로 닫힌다. */
export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline'>기록 수정</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>독서 기록 수정</DialogTitle>
          <DialogDescription>
            변경한 내용은 저장하면 바로 반영됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='dialog-rating'>평점</Label>
            <Input id='dialog-rating' type='number' defaultValue='8' />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='dialog-note'>메모</Label>
            <Textarea id='dialog-note' placeholder='기억하고 싶은 문장' />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline'>취소</Button>
          </DialogClose>
          <Button>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

/**
 * 처음부터 열린 상태. 문서에서 내용을 바로 보여줄 때 쓴다.
 * (실제 화면에서는 `defaultOpen` 을 쓸 일이 거의 없다)
 */
export const Opened: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>독서 목표 설정</DialogTitle>
          <DialogDescription>
            올해 몇 권을 읽고 싶은지 정해 보세요. 언제든 바꿀 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-2'>
          <Label htmlFor='dialog-goal'>목표 권수</Label>
          <Input id='dialog-goal' type='number' defaultValue='60' />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline'>나중에</Button>
          </DialogClose>
          <Button>목표 저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

/**
 * X 버튼을 감출 수 있다(`showCloseButton={false}`). 다만 **닫을 방법이 하나는 남아야 한다** —
 * 여기서는 푸터의 "닫기"가 그 역할을 한다. Esc 도 여전히 동작한다.
 */
export const WithoutCloseButton: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>저장했습니다</DialogTitle>
          <DialogDescription>
            책장에 담았어요. 기록은 마이페이지에서 볼 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button>닫기</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

/**
 * 제목을 화면에서 감춰야 할 때. **지우지 말고 `sr-only` 로 감춘다** —
 * 스크린리더는 여전히 "이미지 미리보기"를 읽는다.
 */
export const VisuallyHiddenTitle: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='sr-only'>표지 미리보기</DialogTitle>
          <DialogDescription className='sr-only'>
            책 표지를 크게 봅니다.
          </DialogDescription>
        </DialogHeader>
        <div className='flex justify-center'>
          <div className='book-cover h-50 w-35 border border-line-soft' />
        </div>
      </DialogContent>
    </Dialog>
  ),
};
