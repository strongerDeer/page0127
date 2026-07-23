'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

export type SlideFields = {
  eyebrow: string;
  line1: string;
  line2: string;
  sub: string;
  href: string;
  cta: string;
  bg: string;
  fg: string;
};

function revalidate() {
  revalidatePath('/admin/banners');
  revalidatePath('/');
}

export async function createSlide(): Promise<void> {
  await assertAdmin();
  const supabase = createAdminClient();

  // 새 슬라이드는 맨 끝 순서로
  const { data: last } = await supabase
    .from('hero_slides')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.sort_order ?? -1) + 1;

  const { error } = await supabase.from('hero_slides').insert({
    eyebrow: '',
    line1: '새 배너',
    line2: '문구를 입력하세요',
    sub: '',
    href: '/login',
    cta: '자세히',
    bg: '#14294e',
    fg: '#f4f8fd',
    sort_order: nextOrder,
    is_active: false, // 기본은 꺼둔 채 생성(편집 후 켜기)
  });
  if (error) throw new Error(`슬라이드 생성 실패: ${error.message}`);
  revalidate();
}

export async function updateSlide(
  id: string,
  fields: SlideFields
): Promise<void> {
  await assertAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('hero_slides')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`슬라이드 저장 실패: ${error.message}`);
  revalidate();
}

export async function deleteSlide(id: string): Promise<void> {
  await assertAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from('hero_slides').delete().eq('id', id);
  if (error) throw new Error(`슬라이드 삭제 실패: ${error.message}`);
  revalidate();
}

export async function toggleActive(
  id: string,
  active: boolean
): Promise<void> {
  await assertAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('hero_slides')
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`상태 변경 실패: ${error.message}`);
  revalidate();
}

// 배열 인덱스를 각 행의 sort_order로 저장한다.
export async function reorderSlides(orderedIds: string[]): Promise<void> {
  await assertAdmin();
  const supabase = createAdminClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('hero_slides')
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq('id', orderedIds[i]);
    if (error) throw new Error(`순서 저장 실패: ${error.message}`);
  }
  revalidate();
}
