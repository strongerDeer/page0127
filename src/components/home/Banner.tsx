'use client';
import Link from 'next/link';

// lib
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { I_Banner } from '@models/banner';

import { Skeleton } from '@components/shared/Skeleton';
import useBanners from '@hooks/useBanner';
import withSuspense from '@components/shared/hocs/withSuspense';

function Banner() {
  const { data, isLoading } = useBanners();

  if (isLoading || data === null || data?.length === 0) {
    return null;
  }
  return (
    <section className="mt-[-4rem]">
      <h2 className="a11y-hidden">배너</h2>
      <Swiper spaceBetween={8}>
        {data?.map((item: I_Banner) => (
          <SwiperSlide
            key={item.id}
            className="bg-blue-100 px-8 py-6 rounded-xl flex items-center h-32"
          >
            {item.link ? (
              <Link href={item.link}>
                <Item title={item.title} description={item.description} />
              </Link>
            ) : (
              <Item title={item.title} description={item.description} />
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
    <section>
      <Skeleton className="bg-blue-100 px-8 py-6 rounded-xl flex items-center h-32" />
    </section>
  );
}

export default withSuspense(Banner, { fallback: <BannerSkeleton /> });
