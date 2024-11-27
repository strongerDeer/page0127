'use client';
import Link from 'next/link';

// lib
import { Swiper, SwiperSlide } from 'swiper/react';
import { Swiper as SwiperType } from 'swiper';
import {
  EffectFade,
  Navigation,
  Pagination,
  A11y,
  Autoplay,
} from 'swiper/modules';

import 'swiper/css/bundle';

import withSuspense from '@components/shared/hocs/withSuspense';
import useBanner from '@connect/banner/useBanner';

import styles from './Banner.module.scss';
import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const Icon = dynamic(() => import('@components/icon/Icon'), {
  ssr: false,
});

interface BannerItem {
  id: string;
  title: string;
  subTitle: string;
  link?: string;
  backgroundColor: string;
  color: string;
}

const AUTOPLAY_DELAY = 5000;
const swiperModules = [EffectFade, Autoplay, Navigation, Pagination, A11y];

function Banner() {
  const { data, isLoading } = useBanner('default');
  const swiperRef = useRef<SwiperType | null>(null);
  const progressCircle = useRef<HTMLSpanElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const onAutoplayTimeLeft = (_: any, __: number, progress: number) => {
    if (progressCircle.current) {
      progressCircle.current.style.setProperty('--progress', `${1 - progress}`);
    }
  };
  const handleToggleAutoplay = () => {
    if (!swiperRef.current?.autoplay) return;

    if (isPlaying) {
      swiperRef.current.autoplay.stop();
    } else {
      swiperRef.current.autoplay.start();
    }
    setIsPlaying(!isPlaying);
  };

  if (isLoading || !data?.length) return null;

  return (
    <section className={styles.section}>
      <h2 className="a11y-hidden">배너</h2>
      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        modules={swiperModules}
        effect={'fade'}
        loop
        autoplay={{
          delay: AUTOPLAY_DELAY,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        onAutoplayTimeLeft={onAutoplayTimeLeft}
        navigation
        pagination={{
          type: 'fraction',
        }}
      >
        {data?.map((item: BannerItem) => (
          <SwiperSlide
            key={item.id}
            className={styles.slideItem}
            style={{ backgroundColor: item.backgroundColor, color: item.color }}
          >
            <div>
              {item.link ? (
                <Link href={item.link}>
                  <Item title={item.title} description={item.subTitle} />
                </Link>
              ) : (
                <Item title={item.title} description={item.subTitle} />
              )}
            </div>
          </SwiperSlide>
        ))}

        <div className={styles.autoPlayLine} slot="container-end">
          <span className={styles.line}>
            <span className={styles.line2} ref={progressCircle}></span>
          </span>
        </div>

        <button
          onClick={handleToggleAutoplay}
          className={styles.playButton}
          aria-label={
            isPlaying ? '배너 슬라이드 일시정지' : '배너 슬라이드 재생'
          }
          aria-pressed={!isPlaying}
        >
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            color="#fff"
            style={{ width: '100%', height: '100%' }}
            aria-hidden="true"
          />
        </button>
      </Swiper>
    </section>
  );
}

const Item = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  return (
    <>
      <h3 className={styles.title}>{title}</h3>
      <p>{description}</p>
    </>
  );
};

export function BannerSkeleton() {
  return (
    <section className={styles.section} aria-busy="true">
      <div className={styles.autoPlayLine} slot="container-end">
        <span className={styles.line}></span>
      </div>
      <div className="swiper-pagination">/</div>
      <div className="swiper-button-prev"></div>
      <div className="swiper-button-next"></div>
      <button className={styles.playButton}>
        <Icon
          name="pause"
          color="#fff"
          style={{ width: '100%', height: '100%' }}
        />
      </button>
    </section>
  );
}

export default withSuspense(Banner, { fallback: <BannerSkeleton /> });
