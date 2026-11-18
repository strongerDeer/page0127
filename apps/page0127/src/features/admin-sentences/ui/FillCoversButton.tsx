'use client';

import { useTransition } from 'react';

import { Button } from '@repo/ui';
import { ImageDown, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';

import { fillSentenceCovers } from '../api/sentenceActions';

/**
 * "표지 채우기" — 표지가 빈 문장을 ISBN 으로 한 번에 채운다 (HJ, 2026-11-18).
 * 채울 문장(표지 없음 + ISBN 있음)이 없으면 버튼을 숨긴다.
 */
export const FillCoversButton = ({ count }: { count: number }) => {
  const [pending, startTransition] = useTransition();
  if (count === 0) return null;

  const handleClick = () =>
    startTransition(async () => {
      const result = await fillSentenceCovers();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      if (result.filled === 0) {
        toast.error('서점에서 표지를 찾지 못했어요.');
        return;
      }
      toast.success(
        `표지 ${result.filled}개를 채웠어요.${
          result.missing > 0
            ? ` (${result.missing}개는 못 찾았어요. 다시 누르면 이어서 찾아요)`
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
      aria-busy={pending}
    >
      {pending ? (
        <LoaderCircle className='animate-spin' aria-hidden />
      ) : (
        <ImageDown aria-hidden />
      )}
      {pending ? '표지 찾는 중… 30초쯤 걸려요' : `표지 채우기 ${count}개`}
    </Button>
  );
};
