'use client';

import { useState, useTransition } from 'react';

import { revealMemberEmail } from '@/features/admin-members/api/revealEmail';

type RevealEmailProps = {
  userId: string;
  maskedEmail: string | null;
};

export const RevealEmail = ({ userId, maskedEmail }: RevealEmailProps) => {
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!maskedEmail) {
    return <p className='text-sm text-text-subtle'>이메일 없음</p>;
  }

  // 원문은 이 컴포넌트 state 에만 있다 — 새로고침하면 다시 가려진다
  if (email) {
    return <p className='text-sm'>{email}</p>;
  }

  const onReveal = () => {
    setError(null);
    startTransition(async () => {
      try {
        setEmail(await revealMemberEmail(userId, reason));
      } catch (e) {
        setError(e instanceof Error ? e.message : '열람에 실패했습니다.');
      }
    });
  };

  return (
    <div className='text-sm'>
      <span className='text-text-subtle'>{maskedEmail}</span>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className='ml-2 text-xs underline text-text-subtle hover:text-text-strong'
        >
          전체 보기
        </button>
      ) : (
        <div className='mt-2 flex max-w-sm gap-2'>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder='열람 사유 (예: 문의 답변)'
            className='flex-1 rounded border border-line px-3 py-1.5 text-sm'
          />
          <button
            onClick={onReveal}
            // 운영 빌드는 서버액션의 throw 문구를 일반 문구로 가린다 — 사유 누락은 여기서 먼저 막는다
            disabled={isPending || reason.trim().length < 2}
            className='rounded border border-line px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50'
          >
            보기
          </button>
        </div>
      )}
      {open && (
        <p className='mt-1 text-xs text-text-subtle'>
          열람한 관리자·시각·사유가 기록됩니다.
        </p>
      )}
      {error && <p className='mt-1 text-xs text-destructive'>{error}</p>}
    </div>
  );
};
