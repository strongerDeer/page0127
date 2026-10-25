'use client';

import { useId, useState } from 'react';

import Link from 'next/link';

import { toDisplayName } from '@/entities/profile/model/displayName';

import { rankReaders } from '../model/readingLeague';
import { LeagueAvatar } from './LeagueAvatar';
import { LeagueDuel } from './LeagueDuel';
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
  actions?: (other: RankedReader, mine: RankedReader) => ReactNode;
};

export const ReadingLeague = ({
  readers,
  currentUserId,
  year,
  discovery,
  actions,
}: ReadingLeagueProps) => {
  const [metric, setMetric] = useState<LeagueMetric>('books');
  const [opponentId, setOpponentId] = useState('');
  const titleId = useId();
  const ranked = rankReaders(readers, metric);
  const mine = ranked.find((reader) => reader.userId === currentUserId);
  const opponents = ranked.filter((reader) => reader.userId !== currentUserId);
  const other =
    opponents.find((reader) => reader.userId === opponentId) ??
    (mine
      ? opponents.filter((reader) => reader.value > mine.value).at(-1)
      : undefined) ??
    opponents[0];
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
          <p className={styles.overline}>{year} READING LEAGUE</p>
          <div className={styles.headingRow}>
            <h2 id={titleId}>
              {solo
                ? '나의 첫 번째 라이벌은?'
                : metric === 'genres'
                  ? '장르 문어발 배틀'
                  : readers.length === 2
                    ? '올해의 독서 배틀'
                    : '올해의 리더보드'}
            </h2>
            <div
              className={styles.metricButtons}
              role='group'
              aria-label='독서 지표'
            >
              {(['books', 'pages', 'genres'] as const).map((value) => (
                <button
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
                </button>
              ))}
            </div>
          </div>
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
          <LeagueDuel key={metric} mine={mine} other={other} unit={unit} />
        ) : (
          <LeaguePodium
            key={metric}
            readers={ranked}
            currentUserId={currentUserId}
            unit={unit}
          />
        )}
        {metric === 'genres' && (
          <div className='px-5 pb-4 text-xs leading-relaxed text-text-subtle'>
            {ranked.map((reader) => (
              <p key={reader.userId}>
                {reader.userId === currentUserId ? '나' : toDisplayName(reader)}
                :{' '}
                {reader.genres?.join(' · ') ||
                  '올해 분류가 확인된 공개 완독 기록 없음'}
              </p>
            ))}
          </div>
        )}
        {actions && other && (
          <div className='border-t border-line-soft p-4'>
            {opponents.length > 1 && (
              <label className='mb-3 block text-sm text-text-subtle'>
                콕 찌를 상대
                <select
                  className='ml-2 rounded border border-line bg-card p-2 text-text-strong'
                  value={other.userId}
                  onChange={(e) => setOpponentId(e.target.value)}
                >
                  {opponents.map((reader) => (
                    <option key={reader.userId} value={reader.userId}>
                      {toDisplayName(reader)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className='flex flex-wrap gap-2'>{actions(other, mine)}</div>
          </div>
        )}
      </section>
      <details className={styles.privacy}>
        <summary>공개 완독 기록 기준 · 재독은 한 권</summary>
        <p>
          나를 포함해 공개한 완독 기록만 비교해요. 비공개 기록은 포함하지
          않아요. 서울 기준 {year}년 기록이며, 완독 날짜가 없으면 완독 연도를
          사용해요.
        </p>
        <p>
          쪽수는 올해 완독한 서로 다른 책의 쪽수 합계예요. 쪽수 정보가 없는 책은
          합계에서 제외해요. 재독은 올해의 대표 회독 한 번만 합산해요.
        </p>
        <p>
          장르 문어발은 서재와 같은 대분류로 비교하고 분류 미상·기타는 제외해요.
        </p>
        <p>
          배틀 게이지는 두 사람 합계에서 각 기록이 차지하는 비율이에요. 선두
          기록 대비 격차 20% 이내는 접전으로 표시해요. 동점은 공동 순위이며,
          0에는 순위를 붙이지 않아요.
        </p>
      </details>
      {metric === 'pages' &&
        ranked.some((reader) => reader.missingPageBooks > 0) && (
          <p className={styles.missingPages} role='status'>
            {ranked
              .filter((reader) => reader.missingPageBooks > 0)
              .map(
                (reader) =>
                  `${reader.userId === currentUserId ? '나' : toDisplayName(reader)}: 쪽수 미등록 ${reader.missingPageBooks}권`
              )
              .join(' · ')}
          </p>
        )}
      {readers.length <= 3 && discovery}
    </div>
  );
};
