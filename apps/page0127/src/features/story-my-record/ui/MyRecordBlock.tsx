'use client';

import Link from 'next/link';

import { Button } from '@repo/ui';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { useCurrentUser } from '@/entities/user';

import type { ThisYearRecord } from '../model/types';

type MyRecordBlockProps = {
  /** 비교할 조사 숫자(예: 38.5). 없으면 비교 문장 없이 내 숫자만 */
  rate: number | null;
  /** rate 가 무엇인지 — "올해 책을 1권 이상 읽은 성인" */
  label: string;
};

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
 */
const BOX =
  'flex min-h-[180px] flex-col gap-4 rounded-2xl border border-line p-5 sm:p-6 tint-sage';

const RING = 2 * Math.PI * 40;

const ProgressRing = ({ done, goal }: { done: number; goal: number }) => {
  const ratio = Math.min(1, done / goal);
  return (
    <svg
      viewBox='0 0 96 96'
      role='img'
      aria-label={`올해 목표 ${goal}권 중 ${done}권 완독`}
      className='size-24 shrink-0'
    >
      <circle
        cx='48'
        cy='48'
        r='40'
        fill='none'
        strokeWidth='8'
        className='stroke-muted'
      />
      <circle
        cx='48'
        cy='48'
        r='40'
        fill='none'
        strokeWidth='8'
        strokeLinecap='round'
        strokeDasharray={`${RING * ratio} ${RING}`}
        transform='rotate(-90 48 48)'
        className='stroke-primary'
      />
      <text
        x='48'
        y='54'
        textAnchor='middle'
        fontSize='18'
        fontWeight='700'
        className='fill-text-strong'
      >
        {done}/{goal}
      </text>
    </svg>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className='flex flex-col'>
    <span className='text-xs text-text-subtle'>{label}</span>
    <b className='text-3xl leading-tight tabular-nums text-text-strong'>
      {value}
    </b>
  </div>
);

export const MyRecordBlock = ({ rate, label }: MyRecordBlockProps) => {
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

  const { completed, goal } = record;

  return (
    <div className={BOX}>
      <div className='flex flex-wrap items-center gap-5'>
        {goal ? <ProgressRing done={completed} goal={goal} /> : null}
        <Stat label='올해 끝까지 읽은 책' value={`${completed}권`} />
        {goal ? <Stat label='올해 목표' value={`${goal}권`} /> : null}
      </div>
      {completed > 0 && rate !== null && label ? (
        <p className='flex items-start gap-2.5 rounded-xl border border-line-soft bg-card px-4 py-3 text-sm break-keep text-text-body'>
          <span
            aria-hidden
            className='mt-[7px] inline-block size-2 shrink-0 rounded-full bg-mint'
          />
          <span>
            조사 기준으로 보면, {label}{' '}
            <b className='text-text-strong'>{rate}%</b> 안에 들어요.
          </span>
        </p>
      ) : null}
      {completed === 0 && (
        <p className='text-sm break-keep text-text-body'>
          아직 올해 완독한 책이 없어요. 읽는 중인 책을 끝까지 읽으면 여기에
          쌓여요.
        </p>
      )}
      <p className='text-xs break-keep text-text-subtle'>
        page0127은 끝까지 읽은 책만 세요. 조사는 1권이라도 읽거나 들은 사람을
        세서 기준이 더 넓어요.
      </p>
    </div>
  );
};
