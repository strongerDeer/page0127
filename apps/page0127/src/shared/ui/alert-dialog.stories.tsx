import { Button } from '@repo/ui';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * 되돌릴 수 없는 일을 하기 전에 한 번 더 묻는 창.
 *
 * ## Dialog 와 다른 점
 *
 * **Dialog 는 닫을 수 있고, AlertDialog 는 선택을 요구한다.**
 * X 버튼이 없고 바깥을 눌러도 닫히지 않는다. 사용자는 "취소" 또는 "실행" 중 하나를
 * 골라야 한다. 그래서 **삭제·탈퇴처럼 되돌릴 수 없는 일에만** 쓴다.
 *
 * 저장·편집처럼 안 해도 그만인 일에 이걸 쓰면 사용자를 붙잡아 두는 셈이 된다 —
 * 그럴 땐 `Dialog` 다.
 *
 * ## 확인 문구는 "무엇이 사라지는지"를 말한다
 *
 * "정말 삭제하시겠습니까?"는 아무 정보가 없다. **무엇이**, **몇 개나**, **되돌릴 수 있는지**를
 * 적는다. 사용자가 지금 무엇을 잃는지 알아야 판단할 수 있다.
 *
 * ```
 * ❌  정말 삭제하시겠습니까?
 * ✅  '아무튼, 계속' 기록을 삭제할까요?
 *     메모와 평점이 함께 지워지고 되돌릴 수 없습니다.
 * ```
 *
 * ## 버튼 라벨도 행동을 말한다
 *
 * "예 / 아니오"는 질문을 다시 읽게 만든다. **"삭제" / "취소"** 처럼 누르면 무슨 일이
 * 일어나는지 그대로 쓴다.
 *
 * ## 접근성
 *
 * - 열리면 포커스가 **취소 쪽에** 간다 — 엔터를 잘못 눌러 지워지는 일을 막는다.
 * - `AlertDialogTitle` 은 생략할 수 없다. 없으면 스크린리더가 무엇을 묻는지 못 읽는다.
 * - 파괴적 행동 버튼은 색만으로 구분하지 않는다. 라벨이 "삭제"여야 색을 못 보는
 *   사용자도 안다.
 */
const meta = {
  title: 'UI/AlertDialog',
  component: AlertDialog,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: '제어 모드로 쓸 때.',
      table: { category: 'State' },
    },
    defaultOpen: {
      control: 'boolean',
      description: '처음부터 열린 채로 시작할지.',
      table: { category: 'State', defaultValue: { summary: 'false' } },
    },
  },
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기록 삭제 — 무엇이 사라지는지 문구에 적는다. */
export const Default: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant='outline'>기록 삭제</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            &lsquo;아무튼, 계속&rsquo; 기록을 삭제할까요?
          </AlertDialogTitle>
          <AlertDialogDescription>
            메모와 평점이 함께 지워지고 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction className='bg-destructive hover:bg-destructive/90'>
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/** 열린 상태. X 버튼이 없고 바깥을 눌러도 닫히지 않는다. */
export const Opened: Story = {
  render: () => (
    <AlertDialog defaultOpen>
      <AlertDialogContent>
        <AlertDialogTitle>
          &lsquo;아무튼, 계속&rsquo; 기록을 삭제할까요?
        </AlertDialogTitle>
        <AlertDialogDescription>
          메모와 평점이 함께 지워지고 되돌릴 수 없습니다.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction className='bg-destructive hover:bg-destructive/90'>
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/**
 * 무게가 다른 두 문구. 위는 사용자가 무엇을 잃는지 모르고, 아래는 안다.
 * **되돌릴 수 없다는 사실을 문구에 넣는 것**이 이 컴포넌트의 존재 이유다.
 */
export const GoodAndBadCopy: Story = {
  render: () => (
    <div className='w-[560px] space-y-4'>
      <div className='rounded-lg border border-destructive/40 bg-card p-5'>
        <p className='mb-2 text-xs font-medium text-destructive'>이렇게 쓰지 않는다</p>
        <p className='text-base font-medium text-text-strong'>
          정말 삭제하시겠습니까?
        </p>
        <p className='mt-1 text-sm text-text-subtle'>이 작업은 취소할 수 없습니다.</p>
        <p className='mt-3 text-xs text-text-subtle'>
          무엇이 지워지는지 알 수 없다. &ldquo;예 / 아니오&rdquo; 라면 질문을 다시
          읽어야 한다.
        </p>
      </div>

      <div className='rounded-lg border border-line bg-card p-5'>
        <p className='mb-2 text-xs font-medium text-primary'>이렇게 쓴다</p>
        <p className='text-base font-medium text-text-strong'>
          &lsquo;아무튼, 계속&rsquo; 기록을 삭제할까요?
        </p>
        <p className='mt-1 text-sm text-text-subtle'>
          메모와 평점이 함께 지워지고 되돌릴 수 없습니다.
        </p>
        <p className='mt-3 text-xs text-text-subtle'>
          무엇이 · 무엇과 함께 · 되돌릴 수 있는지가 다 있다. 버튼은 &ldquo;삭제 /
          취소&rdquo;.
        </p>
      </div>
    </div>
  ),
};
