import { useState } from 'react';

import { RotateCcw } from 'lucide-react';

import { toDisplayName } from '@/entities/profile/model/displayName';
import { ProfileLink } from '@/entities/profile/ui/ProfileLink';

import { battleState } from '../model/readingLeague';
import { LeagueAvatar } from './LeagueAvatar';

import type { RankedReader } from '../model/readingLeague';
import type { CSSProperties } from 'react';

import styles from './ReadingLeague.module.css';

export const LeagueDuel = ({
  mine,
  other,
  unit,
}: {
  mine: RankedReader;
  other: RankedReader;
  unit: string;
}) => {
  const [replay, setReplay] = useState(0);
  const match = battleState(mine.value, other.value);
  const otherName = toDisplayName(other);
  const empty = mine.value === 0 && other.value === 0;
  const missing =
    unit === '쪽' && (mine.missingPageBooks > 0 || other.missingPageBooks > 0);
  const label = empty
    ? '올해의 첫 기록을 기다려요'
    : match.tied
      ? '동점'
      : match.close
        ? '접전'
        : match.leading === 'me'
          ? '내가 앞서는 중'
          : `${otherName}님이 앞서는 중`;

  return (
    <>
      <div className={styles.duel} data-leading={match.leading}>
        <div className={styles.players}>
          <div className={styles.player}>
            <ProfileLink username={mine.username} className={styles.playerLink}>
              <span className={styles.avatarRing}>
                <LeagueAvatar reader={mine} large />
              </span>
              <span className={styles.playerName}>
                나 <span className={styles.you}>YOU</span>
              </span>
            </ProfileLink>
            <p className={styles.score} data-pages={unit === '쪽'}>
              {mine.value.toLocaleString('ko-KR')}
              <small>{unit}</small>
            </p>
          </div>
          <span
            className={styles.versus}
            key={`vs-${replay}`}
            aria-label='대결'
          >
            VS
          </span>
          <div className={`${styles.player} ${styles.rival}`}>
            <ProfileLink
              username={other.username}
              className={styles.playerLink}
            >
              <span className={styles.avatarRing}>
                <LeagueAvatar reader={other} large />
              </span>
              <span className={styles.playerName}>{otherName}</span>
            </ProfileLink>
            <p className={styles.score} data-pages={unit === '쪽'}>
              {other.value.toLocaleString('ko-KR')}
              <small>{unit}</small>
            </p>
          </div>
        </div>
        <div className={styles.gaugeWrap}>
          <div
            className={styles.gauge}
            role='img'
            aria-label={`나 ${mine.value.toLocaleString('ko-KR')}${unit}, ${otherName} ${other.value.toLocaleString('ko-KR')}${unit}. ${label}`}
            data-empty={empty}
            data-exclusive={mine.value === 0 || other.value === 0}
            style={{ '--league-share': `${match.share}%` } as CSSProperties}
          >
            <span key={replay} className={styles.gaugeBlue} />
            <span className={styles.gaugeMint} />
          </div>
          <div className={styles.gaugeLabels}>
            <span>
              <i />
              나의 기록
            </span>
            <span>
              {otherName}의 기록
              <i />
            </span>
          </div>
        </div>
        <div className={styles.result} aria-live='polite'>
          <span className={styles.resultBadge}>{label}</span>
          <p>
            {empty ? (
              missing ? (
                '쪽수 정보를 등록하면 비교할 수 있어요.'
              ) : (
                '올해 첫 공개 완독의 주인공은?'
              )
            ) : match.tied ? (
              <>
                팽팽해요. <strong>다음 한 권</strong>의 주인공은?
              </>
            ) : (
              <>
                {match.leading === 'me' ? '내가' : `${otherName}님이`}{' '}
                <strong>
                  {match.gap.toLocaleString('ko-KR')}
                  {unit}
                </strong>{' '}
                앞서고 있어요.
              </>
            )}
          </p>
          <button
            type='button'
            className={styles.replay}
            onClick={() => setReplay((v) => v + 1)}
            aria-label='배틀 모션 다시 보기'
          >
            <RotateCcw size={14} aria-hidden='true' />
          </button>
        </div>
      </div>
      <div className={styles.cardFooter}>
        <span>다음 한 권, 상대의 책장에서 찾아볼까요?</span>
        <ProfileLink username={other.username} className={styles.shelfLink}>
          {otherName}님 서재 보기 ↗
        </ProfileLink>
      </div>
    </>
  );
};
