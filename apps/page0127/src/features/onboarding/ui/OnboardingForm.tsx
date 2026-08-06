'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import { Button, Input, Label } from '@repo/ui';
import { toast } from 'sonner';

import {
  normalizeUsername,
  validateUsername,
} from '@/entities/profile/model/username';

import { checkUsernameAvailability } from '@/features/profile/api/updateUsernameAction';

import {
  completeOnboardingAction,
  type OnboardingActionState,
} from '../api/completeOnboardingAction';

/** 입력이 멈춘 뒤 중복을 물어볼 때까지 (UsernameChangeDialog 와 같은 값) */
const CHECK_DEBOUNCE_MS = 400;

type FieldState =
  | { kind: 'invalid'; message: string }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'taken'; message: string };

type OnboardingFormProps = {
  /** 가입할 때 자동으로 만들어진 아이디 — 그대로 둬도 된다 */
  initialUsername: string;
  /** 공급자가 준 닉네임. 없으면 빈 값으로 시작한다 */
  initialNickname: string;
};

const initialState: OnboardingActionState = { status: 'idle', message: '' };

/**
 * 첫 로그인 온보딩 — 아이디와 닉네임을 직접 정한다.
 *
 * 왜 필요한가: 아이디는 가입할 때 이메일이나 닉네임에서 **자동으로** 만들어진다.
 * 그 사실을 모르면 자기 이메일 앞부분이 공개 주소가 된 줄도 모르고 지나간다.
 * 카카오처럼 한국어 닉네임이면 `reader_a1b2c3` 같은 값을 받게 된다.
 *
 * 건너뛰기는 두지 않는다 — 아이디는 공개 서재 주소라 반드시 정해져야 한다.
 * 대신 자동 생성된 값이 미리 채워져 있어 그대로 두고 넘어갈 수 있다.
 */
export const OnboardingForm = ({
  initialUsername,
  initialNickname,
}: OnboardingFormProps) => {
  const formId = useId();
  const ids = {
    username: `${formId}-username`,
    nickname: `${formId}-nickname`,
  };

  const [username, setUsername] = useState(initialUsername);
  const [nickname, setNickname] = useState(initialNickname);

  // 어떤 값을 확인한 결과인지 함께 들고 있어야, 입력이 더 진행된 뒤 도착한
  // 낡은 응답을 화면에 쓰지 않는다.
  const [checked, setChecked] = useState<{
    value: string;
    available: boolean;
    message: string;
  } | null>(null);

  // 성공하면 서버 액션이 곧바로 서재로 보낸다(여기로 돌아오지 않는다).
  // 그래서 여기서 다룰 것은 실패뿐이다.
  const [, formAction, isPending] = useActionState(
    async (prev: OnboardingActionState, formData: FormData) => {
      const next = await completeOnboardingAction(prev, formData);
      if (next.status === 'error') toast.error(next.message);
      return next;
    },
    initialState
  );

  // 형식 판정은 동기적이라 상태로 둘 이유가 없다 — 렌더 중에 계산한다
  const formatCheck = validateUsername(username);
  const normalized = normalizeUsername(username);

  // formatCheck 는 매 렌더 새 객체라 그대로 의존성에 두면 effect 가 매번 돈다 —
  // 실제로 달라지는 문자열만 꺼내 둔다.
  // 처음 값(자동 생성된 아이디)도 확인한다. 그대로 두는 것도 선택지이고,
  // checkUsernameAvailability 는 "지금 내 아이디"를 사용 가능으로 본다.
  const candidate = formatCheck.ok ? formatCheck.value : null;

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
  const field: FieldState = !formatCheck.ok
    ? { kind: 'invalid', message: formatCheck.message }
    : checked?.value !== normalized
      ? { kind: 'checking' }
      : checked.available
        ? { kind: 'available' }
        : { kind: 'taken', message: checked.message };

  const canSubmit =
    field.kind === 'available' && nickname.trim().length > 0 && !isPending;

  return (
    <form action={formAction} className='space-y-6'>
      <div className='space-y-2'>
        <Label htmlFor={ids.username}>아이디</Label>
        <Input
          id={ids.username}
          name='username'
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete='off'
          // 모바일에서 첫 글자가 대문자로 바뀌면 규칙에 걸린다
          autoCapitalize='none'
          spellCheck={false}
        />
        <p className='text-xs text-text-subtle'>
          공개 서재 주소가 됩니다 — /{normalized || '아이디'}
        </p>
        {/* 상태 문구는 한 줄만 — 여러 개를 동시에 띄우면 무엇을 고쳐야 할지 흐려진다 */}
        <p
          className={
            field.kind === 'taken' || field.kind === 'invalid'
              ? 'text-xs text-destructive'
              : 'text-xs text-text-subtle'
          }
          role={
            field.kind === 'taken' || field.kind === 'invalid'
              ? 'alert'
              : undefined
          }
        >
          {field.kind === 'invalid' && field.message}
          {field.kind === 'checking' && '확인 중…'}
          {field.kind === 'available' && '쓸 수 있는 아이디예요.'}
          {field.kind === 'taken' && field.message}
        </p>
      </div>

      <div className='space-y-2'>
        <Label htmlFor={ids.nickname}>닉네임</Label>
        <Input
          id={ids.nickname}
          name='nickname'
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={20}
          placeholder='서재에서 보일 이름'
        />
        <p className='text-xs text-text-subtle'>
          피드와 댓글에 이 이름으로 보입니다. 나중에 바꿀 수 있어요.
        </p>
      </div>

      <Button type='submit' size='lg' className='w-full' disabled={!canSubmit}>
        {isPending ? '저장 중…' : '시작하기'}
      </Button>
    </form>
  );
};
