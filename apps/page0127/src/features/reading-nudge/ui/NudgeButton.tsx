'use client';
import { useEffect, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createClient } from '@/shared/config/supabase/client';

import { getSeoulToday } from '@/entities/book/model/libraryPeriod';
import {
  getNudgeRecipients,
  getNudgeSentRecipients,
  type SendEnvelopeInput,
  sendReadingNudge,
} from '@/entities/notification/api/readingNudge';

import { NudgeDialog } from './NudgeDialog';
import { NudgeTrigger } from './NudgeTrigger';

const ALREADY_SENT = '오늘은 이미 보냈어요. 내일 다시 만나요.';
const loadSentRecipients = (userId: string, day: string) =>
  getNudgeSentRecipients(createClient(), userId, day);
const loadRecipients = () => getNudgeRecipients(createClient());
export const NudgeButton = ({
  currentUserId,
  recipientId,
  recipientName,
  context,
  iconOnly = false,
  loadSent = loadSentRecipients,
  loadEligible = loadRecipients,
  send = sendReadingNudge,
}: {
  currentUserId: string;
  recipientId: string;
  recipientName: string;
  context: 'ahead' | 'behind' | 'tied';
  iconOnly?: boolean;
  loadSent?: typeof loadSentRecipients;
  loadEligible?: typeof loadRecipients;
  send?: typeof sendReadingNudge;
}) => {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(getSeoulToday);
  const [checking, setChecking] = useState(false);
  const opening = useRef(false);
  const cache = useQueryClient();
  const queryKey = ['reading-nudge-sent', currentUserId, day] as const;
  // 같은 화면의 여러 버튼이 하루 전송 목록 한 번을 공유한다.
  const sentQuery = useQuery({
    queryKey,
    queryFn: () => loadSent(currentUserId, day),
    staleTime: 30_000,
    retry: 1,
  });
  const eligibleQuery = useQuery({
    queryKey: ['reading-nudge-recipients', currentUserId],
    queryFn: loadEligible,
    staleTime: 30_000,
    retry: 1,
  });
  const eligible = eligibleQuery.data?.includes(recipientId) ?? false;
  const sent = sentQuery.data?.includes(recipientId) ?? false;
  useEffect(() => {
    const updateDay = () => setDay(getSeoulToday());
    const nextDay = new Date(`${day}T00:00:00+09:00`).getTime() + 86_400_000;
    const timer = window.setTimeout(
      updateDay,
      Math.max(0, nextDay - Date.now()) + 50
    );
    window.addEventListener('focus', updateDay);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', updateDay);
    };
  }, [day]);
  const rememberSent = () => {
    const today = getSeoulToday();
    cache.setQueryData<string[]>(
      ['reading-nudge-sent', currentUserId, today],
      (previous = []) => [...new Set([...previous, recipientId])]
    );
    setDay(today);
    setOpen(false);
  };
  const mutation = useMutation({
    mutationFn: (input: SendEnvelopeInput) => send(recipientId, input),
    onSuccess: () => {
      rememberSent();
      void cache.invalidateQueries({
        queryKey: ['reading-nudge-sent', currentUserId],
      });
      toast.success(`${recipientName}님을 콕 찔렀어요.`);
    },
    onError: (error) => {
      // 다른 기기에서 먼저 보낸 경우에도 작성 창을 닫고 같은 상태로 맞춘다.
      if (error.message.includes('오늘은 이미')) {
        rememberSent();
        toast.info(ALREADY_SENT);
      }
    },
  });
  const handleOpen = async () => {
    if (opening.current) return;
    const today = getSeoulToday();
    setDay(today);
    if (sent && day === today) {
      toast.info(ALREADY_SENT);
      return;
    }
    opening.current = true;
    setChecking(true);
    try {
      // 새로고침·다른 기기 전송도 반영하려고 작성 직전에 서버 기록을 확인한다.
      const eligibleRecipients = await cache.fetchQuery({
        queryKey: ['reading-nudge-recipients', currentUserId],
        queryFn: loadEligible,
        staleTime: 0,
      });
      if (!eligibleRecipients.includes(recipientId)) {
        setOpen(false);
        toast.info('맞팔한 사이에만 보낼 수 있어요.');
        return;
      }
      const recipients = await cache.fetchQuery({
        queryKey: ['reading-nudge-sent', currentUserId, today],
        queryFn: () => loadSent(currentUserId, today),
        staleTime: 0,
      });
      if (recipients.includes(recipientId)) {
        toast.info(ALREADY_SENT);
        return;
      }
      mutation.reset();
      setOpen(true);
    } catch {
      toast.error('콕 찌르기 기록을 확인하지 못했어요. 다시 눌러 주세요.');
    } finally {
      opening.current = false;
      setChecking(false);
    }
  };
  return (
    <>
      {/* 이미 보냈어도 이유를 알 수 있도록 네이티브 disabled 대신 클릭 안내를 남긴다. */}
      <NudgeTrigger
        recipientName={recipientName}
        iconOnly={iconOnly}
        sent={sent}
        unavailable={
          eligibleQuery.isError
            ? '맞팔 확인 실패'
            : !eligibleQuery.isPending && !eligible
              ? '맞팔 후 콕 찌르기'
              : undefined
        }
        checking={
          checking ||
          sentQuery.isPending ||
          sentQuery.isError ||
          eligibleQuery.isPending ||
          eligibleQuery.isError
        }
        onClick={() => void handleOpen()}
      />
      <NudgeDialog
        key={`${recipientId}:${context}`}
        open={open}
        onOpenChange={setOpen}
        recipientName={recipientName}
        context={context}
        sending={mutation.isPending}
        sent={sent}
        error={mutation.error?.message}
        onSend={(input) => mutation.mutate(input)}
      />
    </>
  );
};
