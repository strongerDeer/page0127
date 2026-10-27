'use client';
import { useRouter } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

import { respondReadingEnvelope } from '@/entities/notification/api/readingNudge';

import {
  ReadingEnvelopeDialog,
  type ReadingEnvelopeDialogProps,
} from './ReadingEnvelopeDialog';

export const LiveReadingEnvelopeDialog = (
  props: ReadingEnvelopeDialogProps
) => {
  const cache = useQueryClient();
  const router = useRouter();
  return (
    <ReadingEnvelopeDialog
      {...props}
      onRespond={async (input) => {
        const result = await respondReadingEnvelope(
          props.notification.id,
          input
        );
        // 서재·집계·알림에서 같은 기록을 보도록 응답 후 함께 갱신한다.
        await cache.invalidateQueries();
        router.refresh();
        return result;
      }}
    />
  );
};
