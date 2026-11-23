import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAdminStory } from '@/features/admin-stories/api/getAdminStories';
import { StoryEditor } from '@/features/admin-stories/ui/StoryEditor';

export default async function AdminStoryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await getAdminStory(id);
  if (!story) notFound();

  return (
    <section>
      <Link href='/admin/stories' className='text-xs text-text-subtle'>
        ← 책 이야기
      </Link>
      <h1 className='mt-1 mb-4 text-base font-medium'>글 고치기</h1>
      {/* key: 저장 뒤 새 값으로 폼을 다시 채운다 */}
      <StoryEditor key={story.updatedAt} story={story} />
    </section>
  );
}
