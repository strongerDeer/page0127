import Link from 'next/link';

import { StoryEditor } from '@/features/admin-stories/ui/StoryEditor';

export default function AdminStoryNewPage() {
  return (
    <section>
      <Link href='/admin/stories' className='text-xs text-text-subtle'>
        ← 책 이야기
      </Link>
      <h1 className='mt-1 mb-4 text-base font-medium'>새 글</h1>
      <StoryEditor story={null} />
    </section>
  );
}
