import { getAllSlides } from '@/features/admin-banners/api/getAllSlides';
import { getSlideEvents } from '@/features/admin-banners/api/getSlideEvents';
import { BannerManager } from '@/features/admin-banners/ui/BannerManager';

export default async function AdminBannersPage() {
  const [slides, events] = await Promise.all([
    getAllSlides(),
    getSlideEvents(),
  ]);
  return (
    <section>
      <h1 className='mb-4 text-base font-medium'>메인 배너</h1>
      <BannerManager initial={slides} events={events} />
    </section>
  );
}
