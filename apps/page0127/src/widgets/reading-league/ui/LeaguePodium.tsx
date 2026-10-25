import { Crown } from 'lucide-react';

import { toDisplayName } from '@/entities/profile/model/displayName';
import { ProfileLink } from '@/entities/profile/ui/ProfileLink';

import { LeagueAvatar } from './LeagueAvatar';

import type { RankedReader } from '../model/readingLeague';
import type { CSSProperties } from 'react';

import styles from './ReadingLeague.module.css';

export const LeaguePodium = ({
  readers,
  currentUserId,
  unit,
}: {
  readers: RankedReader[];
  currentUserId: string;
  unit: string;
}) => {
  const [first, second, third] = readers.filter((reader) => reader.value > 0);
  const winners = [second, first, third].filter(
    (reader): reader is RankedReader => Boolean(reader)
  );
  const mine = readers.find((reader) => reader.userId === currentUserId);
  const ahead = mine
    ? readers.filter((reader) => reader.value > mine.value).at(-1)
    : undefined;

  return (
    <>
      <div className={styles.board}>
        <div className={styles.boardMeta}>
          <span>나와 팔로잉 {readers.length - 1}명</span>
          <span>올해의 현재 순위</span>
        </div>
        {first ? (
          <div className={styles.podium} aria-label='상위 세 명'>
            {winners.map((reader) => (
              <ProfileLink
                key={reader.userId}
                username={reader.username}
                className={styles.podiumPerson}
              >
                <div className={styles.podiumBody} data-rank={reader.rank}>
                  <span className={styles.podiumAvatar}>
                    {reader.rank === 1 && (
                      <Crown
                        className={styles.crown}
                        size={22}
                        aria-hidden='true'
                      />
                    )}
                    <LeagueAvatar reader={reader} large />
                  </span>
                  <span className={styles.podiumName}>
                    {reader.userId === currentUserId
                      ? '나'
                      : toDisplayName(reader)}
                    {reader.userId === currentUserId && (
                      <span className={styles.you}>YOU</span>
                    )}
                  </span>
                  <span className={styles.podiumValue}>
                    {reader.value.toLocaleString('ko-KR')}
                    {unit}
                  </span>
                  {/* 높이는 등수를 나타낸다. 동점은 높이도 같아야 한다. */}
                  <span
                    className={styles.step}
                    style={
                      {
                        '--league-step-height': `${reader.rank === 1 ? 155 : reader.rank === 2 ? 113 : 80}px`,
                      } as CSSProperties
                    }
                  >
                    <span>{reader.rank}</span>
                  </span>
                </div>
              </ProfileLink>
            ))}
          </div>
        ) : (
          <p className={styles.noRecords}>
            아직 순위가 없어요.
            <br />
            {unit === '쪽' &&
            readers.some((reader) => reader.missingPageBooks > 0)
              ? '쪽수 정보를 등록하면 비교할 수 있어요.'
              : unit === '분야'
                ? '분류가 확인된 올해 공개 완독 기록을 기다리고 있어요.'
                : '올해 첫 공개 완독 기록을 기다리고 있어요.'}
          </p>
        )}
      </div>
      <ol className={styles.readerList} aria-label='전체 독서 순위'>
        {readers.map((reader) => (
          <li
            key={reader.userId}
            className={styles.readerRow}
            data-me={reader.userId === currentUserId}
          >
            <span
              className={styles.rank}
              aria-label={reader.rank ? `${reader.rank}위` : '순위 없음'}
            >
              {reader.rank ?? '—'}
            </span>
            <LeagueAvatar reader={reader} />
            <div className={styles.readerInfo}>
              <ProfileLink
                username={reader.username}
                className={styles.readerName}
              >
                {reader.userId === currentUserId ? '나' : toDisplayName(reader)}
              </ProfileLink>
              {reader.userId === currentUserId && (
                <span className={styles.you}>YOU</span>
              )}
              {reader.completedBooks === 0 && (
                <small>올해 공개 완독 기록 없음</small>
              )}
              {unit === '쪽' && reader.missingPageBooks > 0 && (
                <small>쪽수 미등록 {reader.missingPageBooks}권</small>
              )}
            </div>
            <strong className={styles.readerValue}>
              {reader.value.toLocaleString('ko-KR')}
              {unit}
            </strong>
          </li>
        ))}
      </ol>
      {mine && (
        <p className={styles.ownSummary}>
          {mine.rank ? (
            <>
              현재 {mine.rank}위
              {ahead && (
                <>
                  {' '}
                  · {toDisplayName(ahead)}님과{' '}
                  {(ahead.value - mine.value).toLocaleString('ko-KR')}
                  {unit} 차이예요.
                </>
              )}
            </>
          ) : unit === '쪽' && mine.missingPageBooks > 0 ? (
            '쪽수 정보를 등록하면 순위를 비교할 수 있어요.'
          ) : unit === '분야' ? (
            '책의 분야가 확인되면 순위를 비교할 수 있어요.'
          ) : (
            '나의 올해 첫 기록을 기다리고 있어요.'
          )}
          <br />
          다음 한 권을 기록해 볼까요?
        </p>
      )}
    </>
  );
};
