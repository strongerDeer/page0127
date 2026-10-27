'use client';

import { useId, useState } from 'react';

import Link from 'next/link';

import { SegmentedControl, SegmentedControlItem } from '@repo/ui';

import { toDisplayName } from '@/entities/profile/model/displayName';

import { rankReaders } from '../model/readingLeague';
import { LeagueAvatar } from './LeagueAvatar';
import { LeagueDuel } from './LeagueDuel';
import { LeagueInfo } from './LeagueInfo';
import { LeaguePodium } from './LeaguePodium';

import type {
  LeagueMetric,
  LeagueReader,
  RankedReader,
} from '../model/readingLeague';
import type { PointerEvent, ReactNode } from 'react';

import styles from './ReadingLeague.module.css';

export type ReadingLeagueProps = {
  readers: LeagueReader[];
  currentUserId: string;
  year: number;
  /** 추천 리더는 페이지에서 조립한다. 사용자 검색 feature를 위젯 안에 묶지 않는다. */
  discovery?: ReactNode;
  actions?: (
    other: RankedReader,
    mine: RankedReader,
    appearance?: 'icon' | 'label'
  ) => ReactNode;
};

export const ReadingLeague = ({
  readers,
  currentUserId,
  year,
  discovery,
  actions,
}: ReadingLeagueProps) => {
  const [metric, setMetric] = useState<LeagueMetric>('books');
  const titleId = useId();
  const ranked = rankReaders(readers, metric);
  const mine = ranked.find((reader) => reader.userId === currentUserId);
  const opponents = ranked.filter((reader) => reader.userId !== currentUserId);
  const other =
    (mine
      ? opponents.filter((reader) => reader.value > mine.value).at(-1)
      : undefined) ?? opponents[0];
  const solo = readers.length === 1;
  const unit = metric === 'books' ? '권' : metric === 'pages' ? '쪽' : '분야';
  const genresReady = readers.every((reader) => Array.isArray(reader.genres));
  const onLightMove = (event: PointerEvent<HTMLElement>) => {
    if (
      event.pointerType !== 'mouse' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      '--league-light-x',
      `${((event.clientX - rect.left) / rect.width) * 100}%`
    );
    event.currentTarget.style.setProperty(
      '--league-light-y',
      `${((event.clientY - rect.top) / rect.height) * 100}%`
    );
  };

  if (!mine)
    return (
      <section className={styles.card} aria-label='올해의 리그'>
        <p className={styles.noRecords}>
          리그 기록을 불러오지 못했어요.
          <br />
          잠시 후 다시 확인해 주세요.
        </p>
      </section>
    );

  return (
    <div className={styles.root}>
      <section
        className={styles.card}
        aria-labelledby={titleId}
        onPointerMove={onLightMove}
        onPointerLeave={(event) => {
          event.currentTarget.style.removeProperty('--league-light-x');
          event.currentTarget.style.removeProperty('--league-light-y');
        }}
      >
        <header className={styles.header}>
          <div className={styles.battleBanner}>
            <div>
              <p className={styles.overline}>{year} READING LEAGUE</p>
              <div className={styles.bannerTitle}>
                <h2 id={titleId}>
                  {solo
                    ? '나의 첫 번째 라이벌은?'
                    : metric === 'genres'
                      ? '장르 문어발 배틀'
                      : readers.length === 2
                        ? '올해의 독서 배틀'
                        : '올해의 리더보드'}
                </h2>
                <LeagueInfo
                  year={year}
                  metric={metric}
                  missingPages={ranked
                    .filter((reader) => reader.missingPageBooks > 0)
                    .map(
                      (reader) =>
                        `${reader.userId === currentUserId ? '나' : toDisplayName(reader)}: 쪽수 미등록 ${reader.missingPageBooks}권`
                    )
                    .join(' · ')}
                />
              </div>
            </div>
            <span className={styles.bannerVersus} aria-hidden='true'>
              VS
            </span>
          </div>
          <SegmentedControl
            className={styles.metricButtons}
            role='group'
            aria-label='독서 지표'
          >
            {(['books', 'pages', 'genres'] as const).map((value) => (
              <SegmentedControlItem
                key={value}
                type='button'
                aria-pressed={metric === value}
                disabled={value === 'genres' && !genresReady}
                onClick={() => setMetric(value)}
              >
                {value === 'books'
                  ? '권수'
                  : value === 'pages'
                    ? '쪽수'
                    : '장르 문어발'}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </header>
        {solo ? (
          <div className={styles.solo}>
            <span className={styles.soloAvatar}>
              <LeagueAvatar reader={mine} large />
            </span>
            <h3>
              {mine.completedBooks > 0
                ? '올해도 차곡차곡 읽는 중.'
                : '올해 첫 한 권부터 시작해요.'}
            </h3>
            <p className={styles.score} data-pages={metric === 'pages'}>
              {mine.value.toLocaleString('ko-KR')}
              <small>{unit}</small>
            </p>
            <p>
              {metric === 'genres'
                ? '나의 올해 공개 완독 분야'
                : '나의 올해 공개 완독 기록'}
            </p>
            <p className={styles.invitation}>
              궁금한 책장을 팔로우해 보세요.
              <br />
              함께 읽는 사람이 생기면 배틀이 시작돼요.
            </p>
            <Link href='/search' className={styles.primaryLink}>
              함께 읽을 사람 찾기 ↗
            </Link>
            {mine.completedBooks === 0 && (
              <Link href='/books/add' className={styles.recordLink}>
                첫 완독 기록 남기기
              </Link>
            )}
          </div>
        ) : readers.length === 2 && other ? (
          <LeagueDuel
            key={metric}
            mine={mine}
            other={other}
            unit={unit}
            action={actions?.(
              other,
              mine,
              other.completedBooks === 0 ? 'label' : 'icon'
            )}
          />
        ) : (
          <LeaguePodium
            key={metric}
            readers={ranked}
            currentUserId={currentUserId}
            unit={unit}
            actions={actions ? (reader) => actions(reader, mine) : undefined}
          />
        )}
      </section>
      {readers.length <= 3 && discovery}
    </div>
  );
};
