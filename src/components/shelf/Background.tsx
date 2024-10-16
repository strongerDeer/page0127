import Image from 'next/image';
import styles from './Background.module.scss';

export default function Background({
  backgroundURL,
}: {
  backgroundURL?: string;
}) {
  return (
    <div className={styles.background}>
      <Image
        src={backgroundURL ? backgroundURL : '/images/main-visual.jpg'}
        alt=""
        width={1920}
        height={400}
        priority
      />
    </div>
  );
}
