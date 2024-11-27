'use client';
import clsx from 'clsx';
import styles from './Video.module.scss';
import { useState } from 'react';
import Image from 'next/image';
import Icon from '@components/icon/Icon';

interface Video {
  readonly id: number;
  readonly src: string;
  readonly title: string;
}

const VIDEOS: readonly Video[] = [
  {
    id: 1,
    src: 'LGvAjqNKnhc',
    title:
      '돌고 돌아 "책 읽어라" 독서가 중요한 진짜 이유 - [#유퀴즈온더블럭] 서울대 교육심리학 교수님이 알려주는 서울대 공부법💯 피부과에서 나오는 음악이 공부에 효과적이다?!',
  },
  {
    id: 2,
    src: '__mJMkWGmdk',
    title: '아직도 책에서만 얻을 수 있는 것 - 📚열심히 읽어내린 책 추천',
  },
  {
    id: 3,
    src: 'Gsv_lwRLIvY',
    title: '독서 취미 만들어드림 - “문학은 도움 안 돼” = 진짜인가?',
  },
];

function VideoPlayer({ video }: { video: Video }) {
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false);
  const thumbnailUrl = `https://i.ytimg.com/vi_webp/${video.src}/maxresdefault.webp`;

  if (!isPlayerLoaded) {
    return (
      <div className={styles.videoContainer}>
        <Image
          src={thumbnailUrl}
          alt={`${video.title} 썸네일`}
          className={styles.thumbnail}
          loading="lazy"
          fill
        />
        <button
          onClick={() => setIsPlayerLoaded(true)}
          className={styles.playButton}
          aria-label={`${video.title} 재생하기`}
        >
          <Icon name="play" color="#fff" />
        </button>
      </div>
    );
  }

  return (
    <iframe
      src={`https://www.youtube.com/embed/${video.src}?autoplay=1&enablejsapi=1`}
      title={video.title}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}
export default function Video() {
  return (
    <section className={clsx('max-width', styles.section)}>
      <h3 className="title2">독서 관련 추천 영상</h3>
      <div className={styles.wrap}>
        {VIDEOS.map((video) => (
          <VideoPlayer key={video.id} video={video} />
        ))}
      </div>
    </section>
  );
}
