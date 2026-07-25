'use client';

import Link from 'next/link';

import { activityApi, activityKeys } from '@/entities/activity';

import { ActivityList } from './ActivityList';

/**
 * 팔로잉 피드 — ActivityList에 피드 데이터 소스를 주입한다.
 */
export const ActivityFeed = () => (
  <ActivityList
    queryKey={activityKeys.feeds()}
    queryFn={(params) => activityApi.getFeed(params)}
    emptyState={
      <div className='rounded-2xl bg-sunken py-14 text-center'>
        <p className='text-text-body'>팔로우한 사람이 책을 읽으면 여기에 쌓입니다.</p>
        <Link href='/search' className='mt-3 inline-block text-sm font-medium text-primary hover:underline'>
          함께 읽는 사람 찾아보기
        </Link>
      </div>
    }
  />
);
