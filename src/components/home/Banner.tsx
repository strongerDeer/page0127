'use client';
import Link from 'next/link';

// lib
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { Skeleton } from '@components/shared/Skeleton';

import withSuspense from '@components/shared/hocs/withSuspense';
import useBanner from '@connect/banner/useBanner';

import styles from './Banner.module.scss';

function Banner() {
  const { data, isLoading } = useBanner('default');

  if (isLoading || data === null || data?.length === 0) {
    return null;
  }
  return (
    <section className={styles.section}>
      <h2 className="a11y-hidden">배너</h2>
      <Swiper spaceBetween={8}>
        {data?.map((item) => (
          <SwiperSlide
            key={item.id}
            className={styles.slideItem}
            style={{ backgroundColor: item.backgroundColor, color: item.color }}
          >
            {item.link ? (
              <Link href={item.link}>
                <Item title={item.title} description={item.subTitle} />
              </Link>
            ) : (
              <Item title={item.title} description={item.subTitle} />
            )}
          </SwiperSlide>
        ))}
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
      <h3 className="font-bold text-3xl mb-2">{title}</h3>
      <p>{description}</p>
    </>
  );
};

export function BannerSkeleton() {
  return (
    <section className="mt-[-4rem]" style={{ zIndex: 100 }}>
      <Skeleton className="bg-blue-100 px-8 py-6 rounded-xl flex items-center h-32" />
    </section>
  );
}

export default withSuspense(Banner, { fallback: <BannerSkeleton /> });
