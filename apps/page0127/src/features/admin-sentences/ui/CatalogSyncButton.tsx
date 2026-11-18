'use client';

import { useTransition } from 'react';

import { Button } from '@repo/ui';
import { Library } from 'lucide-react';
import { toast } from 'sonner';

import { addSentenceBooksToCatalog } from '../api/sentenceActions';

/**
 * "전체 도서에 넣기" — 문장의 책을 전체 도서에 한 번에 넣는다 (HJ, 2026-11-18).
 * 넣고 나면 오늘의 문장 "이 책 보러 가기"가 담기 화면 대신 도서 정보로 간다.
 * 이미 있는 책은 건너뛰어 여러 번 눌러도 된다.
 */
export const CatalogSyncButton = () => {
  const [pending, startTransition] = useTransition();

  const handleClick = () =>
    startTransition(async () => {
      const result = await addSentenceBooksToCatalog();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        `문장의 책 ${result.books}권이 전체 도서에 있어요.${
          result.failed > 0
            ? ` (${result.failed}권은 서점에서 못 찾았어요)`
            : ''
        }`
      );
    });

  return (
    <Button
      size='sm'
      variant='outline'
      onClick={handleClick}
      disabled={pending}
    >
      <Library aria-hidden />
      {pending ? '넣는 중…' : '전체 도서에 넣기'}
    </Button>
  );
};
