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
  /** 노출 대상 — all/guest/member */
  audience: 'all' | 'guest' | 'member';
  /** 예약 게시. 폼에서는 datetime-local 문자열이고, 비어 있으면 '제한 없음' */
  starts_at: string;
  ends_at: string;
};

/**
 * 빈 문자열을 NULL 로 되돌린다.
 *
 * datetime-local 입력을 비우면 '' 가 오는데, 그대로 넣으면 timestamptz 캐스팅이
 * 실패한다. 빈 값의 뜻은 "제한 없음"이므로 NULL 이어야 한다 — 여기서 안 바꾸면
 * 운영자가 예약을 **취소할 방법이 없어진다**(한 번 넣으면 못 지운다).
 */
const emptyToNull = (value: string): string | null => value.trim() || null;

function revalidate() {
  revalidatePath('/admin/banners');
  revalidatePath('/');
}

export async function createSlide(): Promise<void> {
  await assertAdmin();
  const supabase = createAdminClient();

  // 새 슬라이드는 맨 끝 순서로. 읽기 실패 시 order 0으로 떨어져 기존 슬라이드와
  // 충돌할 수 있으므로 에러를 던진다.
  const { data: last, error: lastErr } = await supabase
    .from('hero_slides')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastErr) throw new Error(`슬라이드 순서 조회 실패: ${lastErr.message}`);
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
    .update({
      ...fields,
      starts_at: emptyToNull(fields.starts_at),
      ends_at: emptyToNull(fields.ends_at),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) {
    // 기간이 거꾸로면 DB CHECK 이 막는다 — 그 뜻을 운영자 말로 옮긴다
    if (error.message.includes('hero_slides_period_order')) {
      throw new Error('종료 시각이 시작 시각보다 앞설 수 없습니다.');
    }
    throw new Error(`슬라이드 저장 실패: ${error.message}`);
  }
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
