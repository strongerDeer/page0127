'use client';
import { useState } from 'react';

import { Button } from '@repo/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pointer } from 'lucide-react';
import { toast } from 'sonner';

import { createClient } from '@/shared/config/supabase/client';

import { getSeoulToday } from '@/entities/book/model/libraryPeriod';
import {
  getNudgeComposer,
  sendReadingNudge,
} from '@/entities/notification/api/readingNudge';

import { NudgeDialog } from './NudgeDialog';

import type { ReadingNudgeMessage } from '@/entities/notification/model/readingNudge';

export const NudgeButton = ({
  currentUserId,
  recipientId,
  recipientName,
  context,
  iconOnly = false,
}: {
  currentUserId: string;
  recipientId: string;
  recipientName: string;
  context: 'ahead' | 'behind' | 'tied';
  iconOnly?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [sentOn, setSentOn] = useState<string | null>(null);
  const client = useQueryClient();
  const today = getSeoulToday();
  const queryKey = [
    'reading-nudge',
    currentUserId,
    recipientId,
    today,
  ] as const;
  const composer = useQuery({
    queryKey,
    queryFn: () => getNudgeComposer(createClient(), currentUserId, recipientId),
    enabled: open,
    staleTime: 0,
    retry: 1,
  });
  const mutation = useMutation({
    mutationFn: ({
      message,
      bookId,
    }: {
      message: ReadingNudgeMessage;
      bookId: string | null;
    }) => sendReadingNudge(createClient(), recipientId, message, bookId),
    onSuccess: () => {
      setSentOn(today);
      setOpen(false);
      void client.invalidateQueries({ queryKey });
      toast.success(`${recipientName}님을 콕 찔렀어요.`);
    },
  });
  return (
    <>
      <Button
        type='button'
        variant='outline'
        size={iconOnly ? 'icon-sm' : 'md'}
        aria-label={
          iconOnly
            ? `${recipientName}님 ${sentOn === today ? '오늘 콕 찌름' : '콕 찌르기'}`
            : undefined
        }
        title={`${recipientName}님 ${sentOn === today ? '오늘 콕 찌름' : '콕 찌르기'}`}
        onClick={() => {
          mutation.reset();
          setOpen(true);
        }}
        disabled={sentOn === today}
        className={iconOnly ? 'shrink-0 rounded-full' : 'min-w-0 flex-1'}
      >
        <Pointer size={16} aria-hidden='true' />
        {!iconOnly && (sentOn === today ? '오늘 콕 찌름' : '콕 찌르기')}
      </Button>
      <NudgeDialog
        key={context}
        open={open}
        onOpenChange={setOpen}
        recipientName={recipientName}
        context={context}
        books={composer.data?.books ?? []}
        loading={composer.isPending}
        sending={mutation.isPending}
        sent={composer.data?.sent || sentOn === today}
        loadFailed={composer.isError}
        onRetry={() => void composer.refetch()}
        error={composer.error?.message ?? mutation.error?.message}
        onSend={(message, bookId) => mutation.mutate({ message, bookId })}
      />
    </>
  );
};
