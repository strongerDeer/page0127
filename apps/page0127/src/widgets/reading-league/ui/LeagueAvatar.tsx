import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui';

import { toDisplayName, toInitial } from '@/entities/profile/model/displayName';

import type { LeagueReader } from '../model/readingLeague';

import styles from './ReadingLeague.module.css';

export const LeagueAvatar = ({
  reader,
  large = false,
}: {
  reader: LeagueReader;
  large?: boolean;
}) => (
  <Avatar className={large ? styles.avatar : styles.smallAvatar}>
    <AvatarImage
      src={reader.photoUrl ?? undefined}
      alt=''
      className='object-cover'
    />
    <AvatarFallback
      className={styles.avatarFallback}
      aria-label={toDisplayName(reader)}
    >
      {toInitial(reader)}
    </AvatarFallback>
  </Avatar>
);
