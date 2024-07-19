import Image from 'next/image';
import styles from './Background.module.scss';

export default function Background() {
  return (
    <div className={styles.background}>
      <Image src="/images/main-visual.jpg" alt="" width={1920} height={400} />
    </div>
  );
}
