'use client';
import { Button, Switch } from '@repo/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/shared/config/supabase/client';

import {
  getNudgePreference,
  setNudgePreference,
} from '@/entities/notification/api/readingNudge';

export const NudgeSettings = ({ userId }: { userId: string }) => {
  const queryKey = ['reading-nudge-preference', userId];
  const cache = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: () => getNudgePreference(createClient(), userId),
    retry: 1,
  });
  const mutation = useMutation({
    mutationFn: (preference: { enabled: boolean; push_enabled: boolean }) =>
      setNudgePreference(createClient(), userId, preference),
    onSuccess: () => cache.invalidateQueries({ queryKey }),
  });
  return (
    // 설정의 다른 섹션(연결된 계정·푸시 알림)과 같은 모양 — 테두리 대신 옅은 바탕, 위 간격 mt-6.
    // 예전엔 혼자 테두리 박스에 간격이 없어 위 섹션에 붙어 보였다
    <section
      className='mt-6 rounded-2xl bg-sunken px-5 py-4'
      aria-labelledby='nudge-preference-title'
    >
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h2
            id='nudge-preference-title'
            className='text-sm font-medium text-text-strong'
          >
            책 메시지 알림
          </h2>
          <p className='mt-1 text-sm text-text-subtle'>
            책 추천·같이 읽기·한마디를 받을 수 있어요.
          </p>
        </div>
        <Switch
          aria-label='책 메시지 알림 받기'
          checked={query.data?.enabled ?? false}
          disabled={query.isPending || query.isError || mutation.isPending}
          onCheckedChange={(value) =>
            mutation.mutate({
              enabled: value,
              push_enabled: query.data?.push_enabled ?? false,
            })
          }
        />
      </div>
      <div className='mt-5 flex items-center justify-between gap-4'>
        <div>
          <p className='text-sm font-medium'>기기 알림도 받기</p>
          <p className='mt-1 text-xs text-text-subtle'>
            이 기기의 푸시 알림을 허용한 경우 도착을 알려드려요.
          </p>
        </div>
        <Switch
          aria-label='책 메시지 기기 알림 받기'
          checked={query.data?.push_enabled ?? false}
          disabled={!query.data?.enabled || mutation.isPending || query.isError}
          onCheckedChange={(value) =>
            mutation.mutate({ enabled: true, push_enabled: value })
          }
        />
      </div>
      {query.isError && (
        <Button
          type='button'
          variant='outline'
          className='mt-3'
          onClick={() => void query.refetch()}
        >
          설정 다시 불러오기
        </Button>
      )}
      {mutation.isError && (
        <p role='alert' className='mt-3 text-sm text-text-body'>
          {mutation.error.message}
        </p>
      )}
    </section>
  );
};
