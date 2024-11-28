import Image from 'next/image';
import clsx from 'clsx';

import { cormorant } from '@font';
import styles from './Visual.module.scss';

import mainVisual from '/public/images/main-visual.webp';

export function Visual() {
  return (
    <section className={styles.visual}>
      <Image
        src={mainVisual}
        alt=""
        priority
        fill
        loading="eager"
        fetchPriority="high"
        sizes="100vw"
        placeholder="blur"
        style={{ transform: 'translateZ(0)' }}
      />
      <div className="max-width">
        <div className={clsx([styles.text, cormorant.className])}>
          <h2>
            page, 0127<span>.</span>
          </h2>
          <p>My Personal Online Library</p>
        </div>
      </div>
      <div className={styles.circle}></div>
    </section>
  );
}
