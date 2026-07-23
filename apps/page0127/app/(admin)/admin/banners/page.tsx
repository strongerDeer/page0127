import { getAllSlides } from '@/features/admin-banners/api/getAllSlides';
import { BannerManager } from '@/features/admin-banners/ui/BannerManager';

export default async function AdminBannersPage() {
  const slides = await getAllSlides();
  return (
    <section>
      <h1 className='mb-4 text-base font-semibold'>메인 배너</h1>
      <BannerManager initial={slides} />
    </section>
  );
}
