import Banners, { BannerSkeleton } from '@components/home/Banners';
import Visual from '@components/home/Visual';
import { Suspense } from 'react';

export default function Home() {
  return (
    <>
      <Visual />
      <div className="max-width">
        <Suspense fallback={<BannerSkeleton />}>
          <Banners />
        </Suspense>
        <main>main</main>
      </div>
    </>
  );
}
