'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@repo/ui';
import { Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  validateUsername,
} from '@/entities/profile/model/username';

import {
  checkUsernameAvailability,
  updateUsernameAction,
  type UsernameActionState,
} from '@/features/profile/api/updateUsernameAction';

type UsernameChangeDialogProps = {
  currentUsername: string;
};

const initialState: UsernameActionState = { status: 'idle', message: '' };

/** 입력이 멈춘 뒤 중복을 확인하기까지 기다리는 시간 */
const CHECK_DEBOUNCE_MS = 400;

/**
 * 미리보기에 쓸 호스트. 도메인을 여기 적어 두면 커스텀 도메인을 사는 순간 틀어지므로
 * 빌드에 박히는 사이트 주소에서 뽑아 쓴다(프로토콜은 빼고 보여 준다).
 */
const SITE_HOST = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(
  /^https?:\/\//,
  ''
);

/** 입력 한 글자마다의 판정 결과 — 상태가 아니라 렌더 중 계산되는 파생값이다 */
type FieldState =
  | { kind: 'idle' }
  | { kind: 'invalid'; message: string }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'taken'; message: string };

/**
 * 아이디 변경 다이얼로그 — 평생 한 번뿐인 변경이라 별도 입구로 둔다.
 *
 * 왜 다이얼로그인가:
 * 설정 폼 안에 두면 닉네임을 고치다가 아이디까지 바꿔 버리는 사고가 난다.
 * (HTML 은 form 중첩을 허용하지 않아서, 어차피 별도 form 이 필요하기도 하다)
 *
 * 실시간 확인은 편의일 뿐이다 — 통과했어도 저장 순간에 남이 먼저 가져갈 수 있고,
 * 최종 판정은 언제나 서버 액션의 결과다.
 */
export const UsernameChangeDialog = ({
  currentUsername,
}: UsernameChangeDialogProps) => {
  const router = useRouter();
  const fieldId = useId();

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentUsername);

  // 중복 확인 결과만 상태로 둔다. 어떤 값을 확인한 결과인지 함께 들고 있어야
  // 입력이 더 진행된 뒤 도착한 낡은 응답을 화면에 쓰지 않는다.
  const [checked, setChecked] = useState<{
    value: string;
    available: boolean;
    message: string;
  } | null>(null);

  // 후처리(토스트·닫기·새로고침)를 effect 가 아니라 액션 안에서 한다.
  // effect 로 하면 state 변화를 뒤늦게 관찰하는 셈이라 setState 가 렌더를 한 번 더 돈다.
  const [, formAction, isPending] = useActionState(
    async (prev: UsernameActionState, formData: FormData) => {
      const next = await updateUsernameAction(prev, formData);
      if (next.status === 'success') {
        toast.success(next.message);
        setOpen(false);
        router.refresh();
      } else if (next.status === 'error') {
        toast.error(next.message);
      }
      return next;
    },
    initialState
  );

  const normalized = normalizeUsername(value);
  const isUnchanged = normalized === currentUsername;
  // 형식 판정은 동기적이라 상태로 둘 이유가 없다 — 렌더 중에 계산한다
  const formatCheck = validateUsername(value);

  // 서버에 물어볼 값. null 이면 물어볼 것이 없다(안 바꿨거나 형식이 틀렸다).
  // formatCheck 는 매 렌더 새 객체라 그대로 의존성에 두면 effect 가 매번 돈다 —
  // 실제로 달라지는 문자열만 꺼내 둔다.
  const candidate = !isUnchanged && formatCheck.ok ? formatCheck.value : null;

  // 입력이 멈추면 중복을 확인한다. 형식이 틀리면 서버까지 가지 않는다.
  useEffect(() => {
    if (candidate === null) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailability(candidate);
      if (cancelled) return;
      setChecked({
        value: candidate,
        available: result.available,
        message: result.available ? '' : result.message,
      });
    }, CHECK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [candidate]);

  // 화면에 보일 상태는 전부 파생값이다
  const field: FieldState = isUnchanged
    ? { kind: 'idle' }
    : !formatCheck.ok
      ? { kind: 'invalid', message: formatCheck.message }
      : checked?.value !== normalized
        ? { kind: 'checking' } // 아직 이 값에 대한 응답이 없다
        : checked.available
          ? { kind: 'available' }
          : { kind: 'taken', message: checked.message };

  const canSubmit = field.kind === 'available' && !isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type='button' variant='outline' size='sm'>
          변경
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>아이디 변경</DialogTitle>
          <DialogDescription>
            공개 서재 주소가 바뀝니다. <strong>한 번만 바꿀 수 있고</strong>,
            바꾸면 예전 주소로 들어오던 링크는 열리지 않아요.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor={fieldId}>새 아이디</Label>
            <Input
              id={fieldId}
              name='username'
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={USERNAME_MAX_LENGTH}
              autoComplete='off'
              // 모바일 키보드가 첫 글자를 대문자로 올리면 매번 교정 문구를 보게 된다
              autoCapitalize='none'
              spellCheck={false}
              aria-describedby={`${fieldId}-help`}
            />

            {/* 주소를 미리 보여 준다 — 바뀌는 것이 "아이디"가 아니라 "내 링크"임을 알린다 */}
            <p id={`${fieldId}-help`} className='text-xs text-text-subtle'>
              {SITE_HOST}/<strong>{normalized || '...'}</strong>
            </p>

            <FieldMessage state={field} />
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setOpen(false)}
            >
              취소
            </Button>
            <Button type='submit' disabled={!canSubmit}>
              {isPending ? '변경 중…' : '변경하기'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/** 입력 상태를 한 줄로 말한다. 색만으로 알리지 않고 아이콘·문구를 함께 둔다 */
const FieldMessage = ({ state }: { state: FieldState }) => {
  if (state.kind === 'idle') return null;

  if (state.kind === 'checking') {
    return (
      <p className='flex items-center gap-1.5 text-xs text-text-subtle'>
        <Loader2 aria-hidden className='size-3.5 animate-spin' />
        확인 중…
      </p>
    );
  }

  if (state.kind === 'available') {
    return (
      <p role='status' className='flex items-center gap-1.5 text-xs text-primary'>
        <Check aria-hidden className='size-3.5' />
        쓸 수 있는 아이디예요.
      </p>
    );
  }

  return (
    <p
      role='alert'
      className='flex items-center gap-1.5 text-xs text-destructive'
    >
      <X aria-hidden className='size-3.5' />
      {state.message}
    </p>
  );
};
