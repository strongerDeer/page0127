'use client';

import Link from 'next/link';

import { Button } from '@repo/ui';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { useCurrentUser } from '@/entities/user';

import type { ThisYearRecord } from '../model/types';
import type { ReactNode } from 'react';

type MyRecordBlockProps = {
  /**
   * 로그인한 사람의 올해 숫자를 그리는 칸 — 서재의 올해 요약 카드(features/stats)를 위젯이 넣어 준다.
   * features 끼리 import 하지 않으려고 바깥에서 받는다.
   */
  renderRecord: (record: ThisYearRecord) => ReactNode;
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
 * 조사 숫자와 내 숫자를 잇지 않는다(HJ 2026-11-24) — "성인 38.5% 안에 들어요"는 나이를 모르면
 * 맞는 말인지 알 수 없다(프로필에 나이가 없다). 그래서 블록의 rate·label 은 읽기만 하고 그리지 않는다.
 */
const BOX =
  'flex min-h-[180px] flex-col gap-4 rounded-2xl border border-line p-5 sm:p-6 tint-sage';

export const MyRecordBlock = ({ renderRecord }: MyRecordBlockProps) => {
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

  return (
    <div className='flex flex-col gap-2'>
      {renderRecord(record)}
      <p className='px-1 text-xs break-keep text-text-subtle'>
        page0127은 끝까지 읽은 책만 세요. 조사는 1권이라도 읽거나 들은 사람을
        세서 기준이 더 넓어요.
      </p>
    </div>
  );
};
