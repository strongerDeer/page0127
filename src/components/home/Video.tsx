import clsx from 'clsx';
import styles from './Video.module.scss';

export default function Video() {
  return (
    <section className={clsx('max-width', styles.section)}>
      <h3 className="title2">독서 관련 추천 영상</h3>
      <div className={styles.wrap}>
        <iframe src="https://www.youtube.com/embed/tCF80BMAGOs?si=4p5uaG-oNjbExUJZ"></iframe>
        <iframe src="https://www.youtube.com/embed/__mJMkWGmdk?si=-jsaLP7W114pviH9"></iframe>
        <iframe src="https://www.youtube.com/embed/Gsv_lwRLIvY?si=oAAy0z8i_cffONL0"></iframe>
      </div>
    </section>
  );
}
