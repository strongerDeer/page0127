import Image from 'next/image';
import styles from './Visual.module.scss';
import clsx from 'clsx';
import { cormorant } from '@font';

export default function Visual() {
  return (
    <div className={styles.visual}>
      <div className="max-width">
        <div className={clsx([styles.text, cormorant.className])}>
          <h2>
            page, 0127<span>.</span>
          </h2>
          <p>My Personal Online Library</p>
        </div>
      </div>
      <Image src="/images/main-visual.jpg" alt="" sizes="100vw" fill priority />
    </div>
  );
}
