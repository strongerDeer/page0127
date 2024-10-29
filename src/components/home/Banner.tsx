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

import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

import { Skeleton } from '@components/shared/Skeleton';

import withSuspense from '@components/shared/hocs/withSuspense';
import useBanner from '@connect/banner/useBanner';

import styles from './Banner.module.scss';
import { useRef, useState } from 'react';
import Icon from '@components/icon/Icon';

function Banner() {
  const { data, isLoading } = useBanner('default');

  const swiperRef = useRef<SwiperType>();
  const progressCircle = useRef<HTMLSpanElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const onAutoplayTimeLeft = (s: any, time: number, progress: number) => {
    if (progressCircle.current) {
      progressCircle.current.style.setProperty('--progress', `${1 - progress}`);
    }
  };
  const handleToggleAutoplay = () => {
    if (swiperRef.current?.autoplay) {
      if (isPlaying) {
        swiperRef.current.autoplay.stop();
      } else {
        swiperRef.current.autoplay.start();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (isLoading || data === null || data?.length === 0) {
    return null;
  }
  return (
    <section className={styles.section}>
      <h2 className="a11y-hidden">배너</h2>
      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        modules={[EffectFade, Autoplay, Navigation, Pagination, A11y]}
        effect={'fade'}
        loop={true}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        onAutoplayTimeLeft={onAutoplayTimeLeft}
        navigation
        pagination={{
          type: 'fraction',
        }}
      >
        {data?.map((item) => (
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

        <button onClick={handleToggleAutoplay} className={styles.playButton}>
          {isPlaying ? (
            <>
              <Icon
                name="pause"
                color="#fff"
                style={{ width: '100%', height: '100%' }}
              />
            </>
          ) : (
            <>
              <Icon
                name="play"
                color="#fff"
                style={{ width: '100%', height: '100%' }}
              />
            </>
          )}
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
    <section className={styles.section}>
      <Skeleton className="bg-blue-100 px-8 py-6 rounded-xl flex items-center h-32" />
    </section>
  );
}

export default withSuspense(Banner, { fallback: <BannerSkeleton /> });
