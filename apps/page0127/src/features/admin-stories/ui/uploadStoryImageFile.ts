import { resizeAvatarFile } from '@/shared/lib/resizeAvatar';

import { uploadStoryImage } from '../api/storyActions';

import type { StoryImage } from '@/entities/story';

/**
 * 관계도는 글자가 작아 크게 둔다 — 긴 변 2400px. 확대 창이 원본 크기까지 키워 보여 준다.
 * (프로필·표지와 같은 줄이기 함수를 긴 변만 바꿔 쓴다)
 */
const STORY_IMAGE_MAX_EDGE = 2400;

const measure = async (file: File) => {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
};

/** 브라우저에서 줄이고 → 크기를 재고 → 서버 액션으로 올린다. 실패하면 메시지를 던진다 */
export const uploadStoryImageFile = async (
  file: File,
  alt: string
): Promise<StoryImage> => {
  const resized = await resizeAvatarFile(file, {
    maxEdge: STORY_IMAGE_MAX_EDGE,
    name: 'story.webp',
  });
  const { width, height } = await measure(resized);
  const form = new FormData();
  form.append('file', resized);
  const result = await uploadStoryImage(form);
  if (!result.ok) throw new Error(result.message);
  return { src: result.url, width, height, alt };
};
