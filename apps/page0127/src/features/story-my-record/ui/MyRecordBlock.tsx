'use client';

import Link from 'next/link';

import { Button } from '@repo/ui';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { useCurrentUser } from '@/entities/user';

import type { ThisYearRecord } from '../model/types';

/**
 * 블로그 글 속 "올해 내 기록" (```chart type: my-record)
 *
 * 글은 정적 페이지라 이 칸만 브라우저에서 채운다:
 *   ① 로그인 확인(useCurrentUser, 이미 앱 전체가 캐시해 둔 값)
 *   ② 로그인 O → /api/books/this-year 로 올해 완독 수·목표
 *   ③ 로그인 X → 기록 시작 버튼
 * 확인하는 동안은 같은 높이의 빈 칸을 둬서 글이 아래로 밀리지 않게 한다(CLS).
 *
 * 문구 규칙: "평균보다 N권 많아요" 같은 경쟁 말투는 쓰지 않는다. page0127 은 완독만 센다는 걸 꼭 적는다.
 * 조사 숫자와 내 숫자를 잇지 않는다(HJ 2026-11-24) — "성인 38.5% 안에 들어요"는 나이를 모르면
 * 맞는 말인지 알 수 없다(프로필에 나이가 없다). 그래서 블록의 rate·label 은 그리지 않는다.
 *
 * 모양은 서재의 올해 요약 카드(features/stats/YearSummary)와 같은 틀 — 흰 카드, 왼쪽 큰 권수, 오른쪽 목표 막대.
 * 내용(완독 수·목표)은 이 블록의 것 그대로다.
 */
const BOX =
  'flex min-h-[180px] flex-col gap-4 rounded-[28px] border border-line-soft bg-card p-6 sm:p-8';

/** 서재 올해 요약과 같은 얇은 목표 막대 */
const GoalBar = ({ done, goal }: { done: number; goal: number }) => {
  const progress = Math.min(Math.round((done / goal) * 100), 100);
  return (
    <div>
      <div className='mb-1.5 flex justify-between text-xs text-text-subtle'>
        <span>올해 목표 {goal}권</span>
        <span>{progress}%</span>
      </div>
      <div
        role='progressbar'
        aria-label='올해 독서 목표 진행률'
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        className='h-1.5 rounded-full bg-sunken'
      >
        <div
          className='h-full rounded-full bg-primary'
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const MyRecordBlock = () => {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: record, isError } = useQuery({
    queryKey: ['books', 'this-year', user?.id],
    queryFn: async () =>
      (await apiClient.get<ThisYearRecord>('/books/this-year')).data,
    enabled: Boolean(user),
    staleTime: 1000 * 60 * 5,
  });

  if (userLoading || (user && !record && !isError))
    return <div aria-hidden className={BOX} />;

  if (!user)
    return (
      <div className={BOX}>
        <p className='text-base font-semibold break-keep text-text-strong'>
          끝까지 읽은 책을 기록하면, 올해 내 숫자가 여기에 나와요
        </p>
        <p className='text-sm leading-relaxed break-keep text-text-body'>
          page0127은 끝까지 읽은 책만 서재에 꽂아요. 올해 몇 권을 완독했는지
          바로 볼 수 있어요.
        </p>
        <div className='flex justify-end'>
          <Button asChild>
            <Link
              href='/'
              onClick={() =>
                trackEvent('cta_click', {
                  location: 'blog_my_record',
                  label: '내 서재 만들기',
                })
              }
            >
              내 서재 만들기
            </Link>
          </Button>
        </div>
      </div>
    );

  if (!record)
    return (
      <div className={BOX}>
        <p className='text-sm text-text-subtle'>
          올해 기록을 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.
        </p>
      </div>
    );

  const { year, completed, goal } = record;

  return (
    <div className='flex flex-col gap-2'>
      <section className='grid gap-6 rounded-[28px] border border-line-soft bg-card p-6 sm:p-8 md:grid-cols-[200px_1fr] md:items-center'>
        <div>
          <p className='text-sm text-text-subtle'>{year}년 끝까지 읽은 책</p>
          <p className='mt-1 text-6xl font-bold tracking-[-0.04em] text-text-strong'>
            {completed}
            <span className='ml-1 text-xl font-medium text-text-subtle'>
              권
            </span>
          </p>
        </div>
        <div className='flex min-w-0 flex-col gap-3'>
          {goal ? <GoalBar done={completed} goal={goal} /> : null}
          {completed === 0 && (
            <p className='text-sm break-keep text-text-body'>
              아직 올해 완독한 책이 없어요. 읽는 중인 책을 끝까지 읽으면 여기에
              쌓여요.
            </p>
          )}
          <p className='text-xs break-keep text-text-subtle'>
            page0127은 끝까지 읽은 책만 세요. 조사는 1권이라도 읽거나 들은
            사람을 세서 기준이 더 넓어요.
          </p>
        </div>
      </section>
    </div>
  );
};
