'use client';
import Link from 'next/link';

// lib
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { Banner } from '@models/banner';
import { useQuery } from 'react-query';
import { COLLECTIONS } from '@constants';
import { getBaners } from '@remote/banners';

export default function Banners() {
  const { data: banners } = useQuery([COLLECTIONS.BANNERS], () => getBaners());

  return (
    <section>
      <h2 className="a11y-hidden">배너</h2>
      {banners && (
        <Swiper spaceBetween={8}>
          {banners?.map((item: Banner) => (
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
