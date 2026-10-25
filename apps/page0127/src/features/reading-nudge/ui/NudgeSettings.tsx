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
    mutationFn: (enabled: boolean) =>
      setNudgePreference(createClient(), userId, enabled),
    onSuccess: () => cache.invalidateQueries({ queryKey }),
  });
  return (
    <section
      className='rounded-xl border border-line p-5'
      aria-labelledby='nudge-preference-title'
    >
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h3 id='nudge-preference-title' className='font-semibold'>
            콕 찌르기 알림
          </h3>
          <p className='mt-1 text-sm text-text-subtle'>
            함께 읽자는 앱 내 초대를 받을 수 있어요.
          </p>
        </div>
        <Switch
          aria-label='콕 찌르기 알림 받기'
          checked={query.data ?? false}
          disabled={query.isPending || query.isError || mutation.isPending}
          onCheckedChange={(value) => mutation.mutate(value)}
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
