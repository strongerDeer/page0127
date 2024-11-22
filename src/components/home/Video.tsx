import clsx from 'clsx';
import styles from './Video.module.scss';

interface Video {
  readonly id: number;
  readonly src: string;
  readonly title: string;
}

const VIDEOS: readonly Video[] = [
  {
    id: 1,
    src: 'tCF80BMAGOs?si=4p5uaG-oNjbExUJZ',
    title:
      '2만원 가진 이동진의 올해의 책 - 23년 올해의 책은 이 3권으로 정리합니다',
  },
  {
    id: 2,
    src: '__mJMkWGmdk?si=-jsaLP7W114pviH9',
    title: '아직도 책에서만 얻을 수 있는 것 - 📚열심히 읽어내린 책 추천',
  },
  {
    id: 3,
    src: 'Gsv_lwRLIvY?si=oAAy0z8i_cffONL0',
    title: '독서 취미 만들어드림 - “문학은 도움 안 돼” = 진짜인가?',
  },
];

export default function Video() {
  return (
    <section className={clsx('max-width', styles.section)}>
      <h3 className="title2">독서 관련 추천 영상</h3>
      <div className={styles.wrap}>
        {VIDEOS.map((video) => (
          <iframe
            key={video.id}
            src={`https://www.youtube.com/embed/${video.src}`}
            title={video.title}
            loading="lazy"
            allowFullScreen
          />
        ))}
      </div>
    </section>
  );
}
