import Image from 'next/image';
import clsx from 'clsx';

import { cormorant } from '@font';
import styles from './Visual.module.scss';

import mainVisual from '/public/images/main-visual.webp';
import withSuspense from '@components/shared/hocs/withSuspense';

function Visual() {
  return (
    <section className={styles.visual}>
      <Image
        src={mainVisual}
        alt=""
        quality={50}
        priority
        fill
        loading="eager"
        fetchPriority="high"
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
      <div className={styles.circle}></div>
    </section>
  );
}
export function VisualSkeleton() {
  return (
    <section className={styles.visual}>
      <div className={styles.circle}></div>
    </section>
  );
}
export default withSuspense(Visual, { fallback: <VisualSkeleton /> });
