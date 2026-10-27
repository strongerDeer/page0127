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

import type { SendEnvelopeInput } from '@/entities/notification/api/readingNudge';

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
    mutationFn: (input: SendEnvelopeInput) =>
      sendReadingNudge(recipientId, input),
    onSuccess: () => {
      setSentOn(today);
      setOpen(false);
      void client.invalidateQueries({ queryKey });
      toast.success(`${recipientName}님께 메시지를 보냈어요.`);
    },
  });
  return (
    <>
      <Button
        type='button'
        variant='outline'
        size={iconOnly ? 'sm' : 'md'}
        onClick={() => {
          mutation.reset();
          setOpen(true);
        }}
        disabled={sentOn === today}
        className='min-w-0 shrink-0 rounded-full'
      >
        <Pointer size={16} aria-hidden='true' />
        {sentOn === today ? '오늘 보냄' : '메시지'}
      </Button>
      <NudgeDialog
        key={context}
        open={open}
        onOpenChange={setOpen}
        recipientName={recipientName}
        context={context}
        loading={composer.isPending}
        sending={mutation.isPending}
        sent={composer.data?.sent || sentOn === today}
        loadFailed={composer.isError}
        onRetry={() => void composer.refetch()}
        error={composer.error?.message ?? mutation.error?.message}
        onSend={(input) => mutation.mutate(input)}
      />
    </>
  );
};
