'use client';
import { useId, useState } from 'react';

import { Button } from '@repo/ui';
import { ArrowRight, Users } from 'lucide-react';

import { getDefaultPastSelfPeriod } from '@/entities/book';

import { battleState } from '../model/readingLeague';
import { LeagueAvatar } from './LeagueAvatar';
import { LeagueInfo } from './LeagueInfo';

import type { PastSelfHistory, PastSelfPeriod } from '@/entities/book';
import type { FollowingLeagueReader } from '@/entities/follow';
import type { CSSProperties } from 'react';

import selfStyles from './PastSelfBattle.module.css';
import styles from './ReadingLeague.module.css';

const dateLabel = (from: string, to: string) =>
  `${from.slice(2).replaceAll('-', '.')} — ${to.slice(5).replace('-', '.')}`;
export const PastSelfBattle = ({
  reader,
  history,
  onDiscover,
}: {
  reader: FollowingLeagueReader;
  history: PastSelfHistory;
  onDiscover: () => void;
}) => {
  const [selectedPeriod, setPeriod] = useState<PastSelfPeriod>();
  const [metric, setMetric] = useState<'books' | 'pages'>('books');
  const titleId = useId();
  const period = selectedPeriod ?? getDefaultPastSelfPeriod(history);
  const { current, previous } = history[period];
  const yearly = period === 'year',
    unit = metric === 'books' ? '권' : '쪽';
  const now = metric === 'books' ? current.completedBooks : current.totalPages;
  const past =
    metric === 'books' ? previous.completedBooks : previous.totalPages;
  const hasPast = previous.completedBooks > 0;
  const missingPages =
    metric === 'pages' &&
    current.missingPageBooks + previous.missingPageBooks > 0;
  const match = battleState(now, past);
  const previousName = yearly ? '작년의 나' : '지난달의 나';
  const currentName = yearly ? '올해의 나' : '이번 달의 나';
  const status = missingPages
    ? '쪽수 정보 일부 없음'
    : match.tied
      ? '지난 나와 동점'
      : match.leading === 'me'
        ? '지난 나를 앞서는 중'
        : '지난 나가 앞서는 중';
  const description = missingPages
    ? '쪽수가 등록된 완독 기록만 표시해요.'
    : match.tied
      ? '다음 완독이 새로운 나를 만들어요.'
      : match.leading === 'me'
        ? metric === 'books'
          ? `같은 날짜까지, ${match.gap.toLocaleString('ko-KR')}권 더 완독했어요.`
          : `완독한 책 기준, ${match.gap.toLocaleString('ko-KR')}쪽 앞서 있어요.`
        : `지난 기록까지 ${match.gap.toLocaleString('ko-KR')}${unit} 차이예요.`;
  return (
    <div className={styles.root}>
      <section className={styles.card} aria-labelledby={titleId}>
        <header className={styles.header}>
          <div className={styles.battleBanner}>
            <div>
              <p className={styles.overline}>TIME RIVAL · 팔로잉 0명</p>
              <div className={styles.bannerTitle}>
                <h2 id={titleId}>
                  {hasPast
                    ? '지금의 라이벌은 지난 나.'
                    : '첫 라이벌을 만나볼까요?'}
                </h2>
                <LeagueInfo
                  year={Number(history.asOf.slice(0, 4))}
                  metric={metric}
                >
                  <p>
                    서울 기준 {history.asOf.replaceAll('-', '.')} · 공개 완독만
                    비교해요.
                  </p>
                  <p>
                    같은 날짜까지의 기록이며 없는 날짜는 말일로 맞춰요. 재독은
                    각 기간 한 권이에요.
                  </p>
                  <p>정확한 완독 날짜가 없는 기록은 제외해요.</p>
                  {(current.undatedBooks > 0 || previous.undatedBooks > 0) && (
                    <p>
                      날짜 미상: 현재 비교 {current.undatedBooks}권 · 지난 비교{' '}
                      {previous.undatedBooks}권
                    </p>
                  )}
                  {metric === 'pages' && (
                    <p>
                      쪽수는 완독한 책의 쪽수 합계이며 미등록 책은 제외해요.
                      현재 {current.missingPageBooks}권 · 지난{' '}
                      {previous.missingPageBooks}권 미등록
                    </p>
                  )}
                </LeagueInfo>
              </div>
            </div>
            <span className={styles.bannerVersus} aria-hidden='true'>
              VS
            </span>
          </div>
          <div className={selfStyles.controls}>
            <select
              aria-label='지난 나와 비교할 기간'
              value={period}
              onChange={(e) => setPeriod(e.target.value as PastSelfPeriod)}
            >
              <option value='month'>지난달의 나</option>
              <option value='year'>작년의 나</option>
            </select>
            <div
              className={styles.metricButtons}
              role='group'
              aria-label='지난 나와 비교할 지표'
            >
              {(['books', 'pages'] as const).map((value) => (
                <button
                  type='button'
                  key={value}
                  aria-pressed={metric === value}
                  onClick={() => setMetric(value)}
                >
                  {value === 'books' ? '권수' : '쪽수'}
                </button>
              ))}
            </div>
          </div>
        </header>
        {hasPast ? (
          <div className={`${styles.duel} ${selfStyles.arena}`}>
            <p className={selfStyles.scope}>같은 날짜까지의 기록</p>
            <div className={styles.players}>
              <div className={styles.player}>
                <span className={`${styles.avatarRing} ${selfStyles.avatar}`}>
                  <LeagueAvatar reader={reader} large />
                </span>
                <h3 className={selfStyles.name}>{currentName}</h3>
                <p className={selfStyles.date}>
                  {dateLabel(current.from, current.to)}
                </p>
                <p className={styles.score} data-pages={metric === 'pages'}>
                  {now.toLocaleString('ko-KR')}
                  <small>{unit}</small>
                </p>
              </div>
              <span className={styles.versus} aria-label='대결'>
                VS
              </span>
              <div className={`${styles.player} ${styles.rival}`}>
                <span
                  className={`${styles.avatarRing} ${selfStyles.avatar} ${selfStyles.pastAvatar}`}
                >
                  <LeagueAvatar reader={reader} large />
                </span>
                <h3 className={selfStyles.name}>{previousName}</h3>
                <p className={selfStyles.date}>
                  {dateLabel(previous.from, previous.to)}
                </p>
                <p className={styles.score} data-pages={metric === 'pages'}>
                  {past.toLocaleString('ko-KR')}
                  <small>{unit}</small>
                </p>
              </div>
            </div>
            <div className={styles.gaugeWrap}>
              <div
                key={`${period}-${metric}`}
                className={styles.gauge}
                role='img'
                aria-label={`${currentName} ${now.toLocaleString('ko-KR')}${unit}, ${previousName} ${past.toLocaleString('ko-KR')}${unit}`}
                data-empty={(now === 0 && past === 0) || missingPages}
                data-exclusive={now === 0 || past === 0}
                style={
                  {
                    '--league-share': `${missingPages ? 50 : match.share}%`,
                  } as CSSProperties
                }
              >
                <span className={styles.gaugeBlue} />
                <span className={styles.gaugeMint} />
              </div>
              <div className={styles.gaugeLabels}>
                <span>
                  <i />
                  나의 기록
                </span>
                <span>
                  {previousName}의 기록
                  <i />
                </span>
              </div>
            </div>
            <div className={selfStyles.outcome} aria-live='polite'>
              <span className={styles.resultBadge}>{status}</span>
              <p>{description}</p>
            </div>
          </div>
        ) : (
          <div className={selfStyles.empty}>
            <span className={styles.soloAvatar}>
              <LeagueAvatar reader={reader} large />
            </span>
            <h3>
              {reader.completedBooks > 0
                ? '함께 읽을 라이벌을 만나볼까요?'
                : '첫 기록은, 함께 시작해도 좋아요.'}
            </h3>
            <p>
              {previous.undatedBooks > 0
                ? '비교할 지난 기록의 완독 날짜가 부족해요.'
                : '비교할 지난 공개 완독 기록이 아직 없어요.'}
              <br />
              궁금한 책장을 팔로우해 볼까요?
            </p>
            <div className={selfStyles.ownRecord}>
              <span>나의 올해 공개 완독</span>
              <strong>
                {reader.completedBooks.toLocaleString('ko-KR')}
                <small>권</small>
              </strong>
            </div>
          </div>
        )}
        <div className={selfStyles.cta}>
          <p>함께 읽는 사람이 생기면 더 재미있어요.</p>
          <Button type='button' className='w-full' onClick={onDiscover}>
            <Users size={16} aria-hidden='true' />
            다른 리더와 비교하기
            <ArrowRight size={16} aria-hidden='true' />
          </Button>
        </div>
      </section>
    </div>
  );
};
