import Image from 'next/image';
import styles from './Visual.module.scss';
import clsx from 'clsx';
import { cormorant } from '@app/font';

export default function Visual() {
  return (
    <div className={styles.visual}>
      <div className={clsx([styles.text, cormorant.className])}>
        <h2>page, 0127_</h2>
        <p>My Personal Online Library</p>
      </div>

      <Image
        src="/images/main-visual.jpg"
        alt=""
        width={1920}
        height={400}
        priority={true}
      />
    </div>
  );
}
