'use client';

import { useOptimistic, useState, useTransition } from 'react';

import { Switch } from '@repo/ui';

import { updateSearchIndexableAction } from '../api/updateSearchIndexableAction';

type SearchVisibilitySettingProps = {
  /** 서버가 읽어 온 현재 값 (profiles.search_indexable, 기본 true) */
  initialValue: boolean;
};

/**
 * 설정 > "검색엔진에 내 서재 보이기"
 *
 * 학습 포인트:
 * - useOptimistic: 누르는 즉시 스위치를 옮기고, 서버가 실패하면 원래 값으로 돌아간다
 * - useTransition: 서버 액션이 도는 동안 isPending 으로 연타를 막는다
 * - 이 섹션은 설정 폼(<form>) 안에 끼워지므로 자체 form 을 두지 않고 액션을 직접 부른다
 */
export const SearchVisibilitySetting = ({
  initialValue,
}: SearchVisibilitySettingProps) => {
  const [saved, setSaved] = useState(initialValue);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleChange = (next: boolean) => {
    setError(null);
    startTransition(async () => {
      setOptimistic(next);
      const result = await updateSearchIndexableAction(next);
      if (result.status === 'success') {
        setSaved(result.searchIndexable);
      } else {
        // saved 를 그대로 두면 transition 이 끝날 때 스위치가 원래 값으로 돌아간다
        setError(result.message);
      }
    });
  };

  return (
    // 설정의 다른 섹션(책 메시지 알림 등)과 같은 모양
    <section
      className='mt-6 rounded-2xl bg-sunken px-5 py-4'
      aria-labelledby='search-visibility-title'
    >
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h2
            id='search-visibility-title'
            className='text-sm font-medium text-text-strong'
          >
            검색엔진에 내 서재 보이기
          </h2>
          <p className='mt-1 text-sm text-text-subtle'>
            끄면 구글·네이버 같은 검색 결과에 내 서재가 나오지 않아요. 링크로
            들어오는 사람은 지금처럼 볼 수 있어요.
          </p>
        </div>
        <Switch
          aria-label='검색엔진에 내 서재 보이기'
          checked={optimistic}
          disabled={isPending}
          onCheckedChange={handleChange}
        />
      </div>
      {error && (
        <p role='alert' className='mt-3 text-sm text-text-body'>
          {error}
        </p>
      )}
    </section>
  );
};
