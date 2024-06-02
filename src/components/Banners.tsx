'use client';
import useGetBanners from '@hooks/useGetBanners';
import Link from 'next/link';

// lib
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

export default function Banners() {
  const { data: banners } = useGetBanners();

  return (
    <section>
      <h2 className="a11y-hidden">배너</h2>
      {banners && (
        <Swiper spaceBetween={8}>
          {banners?.map((item) => (
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
      )}
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
