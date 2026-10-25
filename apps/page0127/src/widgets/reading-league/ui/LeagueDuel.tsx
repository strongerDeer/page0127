import { useState } from 'react';

import { RotateCcw } from 'lucide-react';

import { toDisplayName } from '@/entities/profile/model/displayName';
import { ProfileLink } from '@/entities/profile/ui/ProfileLink';

import { battleState } from '../model/readingLeague';
import { LeagueAvatar } from './LeagueAvatar';

import type { RankedReader } from '../model/readingLeague';
import type { CSSProperties, ReactNode } from 'react';

import styles from './ReadingLeague.module.css';

export const LeagueDuel = ({
  mine,
  other,
  unit,
  action,
}: {
  mine: RankedReader;
  other: RankedReader;
  unit: string;
  action?: ReactNode;
}) => {
  const [replay, setReplay] = useState(0);
  const match = battleState(mine.value, other.value);
  const otherName = toDisplayName(other);
  const empty = mine.value === 0 && other.value === 0;
  const missing =
    unit === '쪽' && (mine.missingPageBooks > 0 || other.missingPageBooks > 0);
  const label = empty
    ? unit === '분야'
      ? '분류가 확인된 기록을 기다려요'
      : '올해의 첫 기록을 기다려요'
    : other.completedBooks === 0
      ? '상대의 올해 공개 기록을 기다려요'
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
            <div className={styles.rivalIdentity}>
              <ProfileLink
                username={other.username}
                className={styles.playerLink}
              >
                <span className={styles.avatarRing}>
                  <LeagueAvatar reader={other} large />
                </span>
              </ProfileLink>
              <div className={styles.playerName}>
                {action}
                <ProfileLink username={other.username}>{otherName}</ProfileLink>
              </div>
            </div>
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
          {empty && missing && <p>쪽수 정보를 등록하면 비교할 수 있어요.</p>}
          {!empty && !match.tied && other.completedBooks > 0 && (
            <p>
              {match.gap.toLocaleString('ko-KR')}
              {unit} 차이
            </p>
          )}
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
        <ProfileLink username={other.username} className={styles.shelfLink}>
          {otherName}님 서재 보기 ↗
        </ProfileLink>
      </div>
    </>
  );
};
