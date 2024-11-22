import Image from 'next/image';
import clsx from 'clsx';

import { cormorant } from '@font';
import styles from './Visual.module.scss';

import mainVisual from '/public/images/main-visual.webp';

export default function Visual() {
  return (
    <div className={styles.visual}>
      <Image
        src={mainVisual}
        alt=""
        quality={75}
        priority
        fill
        sizes="100vw"
        placeholder="blur"
      />
      <div className="max-width">
        <div className={clsx([styles.text, cormorant.className])}>
          <h2>
            page, 0127<span>.</span>
          </h2>
          <p>My Personal Online Library</p>
        </div>
      </div>
    </div>
  );
}
