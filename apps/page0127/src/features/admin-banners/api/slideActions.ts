'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import { HERO_SLIDES_CACHE_TAG } from '@/entities/banner/api/getActiveHeroSlides';

import { kstInputToIso } from '../lib/kstTime';

import type { BeltStyle, CoverStyle } from '@/entities/banner/types';

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
  /** 예약 게시. 폼에서는 datetime-local 문자열(**한국 시간**)이고, 비어 있으면 '제한 없음' */
  starts_at: string;
  ends_at: string;
  /** 띠지: default=기본 문구, custom=위 문구와 bg/fg */
  belt_style: BeltStyle;
  /** 표지: default=기본 파란 표지, custom=아래 값으로 갈아입힘 */
  cover_style: CoverStyle;
  cover_bg: string;
  cover_fg: string;
  /** 비우면 기본 제목 */
  cover_title: string;
  show_number: boolean;
  /** banner-art 버킷 공개 URL. 비우면 그림 없음 */
  art_url: string;
  /** 그림 가운데 위치(표지 기준 %) */
  art_x: number;
  art_y: number;
  /** 그림 너비(표지 너비 대비 %) */
  art_w: number;
};

const BANNER_ART_BUCKET = 'banner-art';
/** 브라우저가 600px WEBP 로 줄여 보내므로 보통 100KB 안팎. 버킷 한도와 같다 */
const MAX_BANNER_ART_BYTES = 1024 * 1024;
const ART_EXTENSION_BY_TYPE: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

/** DB CHECK 과 같은 범위 — 범위 밖이면 저장 자체가 실패하므로 미리 맞춘다 */
const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const colorOrNull = (value: string): string | null =>
  HEX_COLOR.test(value.trim()) ? value.trim() : null;

/** 그림 주소는 우리 버킷에서 올린 것만 받는다(아무 외부 주소나 홈 표지에 뜨지 않게) */
const artUrlOrNull = (value: string): string | null => {
  const url = value.trim();
  if (!url) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    !base ||
    !url.startsWith(`${base}/storage/v1/object/public/${BANNER_ART_BUCKET}/`)
  ) {
    throw new Error('그림은 이 화면에서 올린 파일만 쓸 수 있습니다.');
  }
  return url;
};

/**
 * 빈 문자열을 NULL 로 되돌린다.
 *
 * datetime-local 입력을 비우면 '' 가 오는데, 그대로 넣으면 timestamptz 캐스팅이
 * 실패한다. 빈 값의 뜻은 "제한 없음"이므로 NULL 이어야 한다 — 여기서 안 바꾸면
 * 운영자가 예약을 **취소할 방법이 없어진다**(한 번 넣으면 못 지운다).
 */
const emptyToNull = (value: string): string | null => value.trim() || null;

/** 폼 값 → DB 행. 예약 시각은 KST 로 붙이고, 종류·범위를 DB CHECK 에 맞춘다 */
const toRow = (fields: SlideFields) => ({
  eyebrow: fields.eyebrow,
  line1: fields.line1,
  line2: fields.line2,
  sub: fields.sub,
  href: fields.href,
  cta: fields.cta,
  bg: fields.bg,
  fg: fields.fg,
  audience: fields.audience,
  starts_at: kstInputToIso(fields.starts_at),
  ends_at: kstInputToIso(fields.ends_at),
  belt_style: fields.belt_style === 'default' ? 'default' : 'custom',
  cover_style: fields.cover_style === 'custom' ? 'custom' : 'default',
  cover_bg: colorOrNull(fields.cover_bg),
  cover_fg: colorOrNull(fields.cover_fg),
  cover_title: emptyToNull(fields.cover_title),
  show_number: Boolean(fields.show_number),
  art_url: artUrlOrNull(fields.art_url),
  art_x: clamp(fields.art_x, 0, 100),
  art_y: clamp(fields.art_y, 0, 100),
  art_w: clamp(fields.art_w, 10, 60),
});

/** 맨 끝 순서 번호. 읽기 실패 시 0 으로 떨어져 기존 슬라이드와 겹칠 수 있으므로 던진다 */
async function nextSortOrder(
  supabase: ReturnType<typeof createAdminClient>
): Promise<number> {
  const { data: last, error } = await supabase
    .from('hero_slides')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`슬라이드 순서 조회 실패: ${error.message}`);
  return (last?.sort_order ?? -1) + 1;
}

function revalidate() {
  // 홈의 슬라이드는 5분 캐시다 — 저장하면 바로 보이도록 캐시를 지운다
  updateTag(HERO_SLIDES_CACHE_TAG);
  revalidatePath('/admin/banners');
  revalidatePath('/');
}

export async function createSlide(): Promise<void> {
  await assertAdmin();
  const supabase = createAdminClient();

  // 새 슬라이드는 맨 끝 순서로
  const nextOrder = await nextSortOrder(supabase);

  const { error } = await supabase.from('hero_slides').insert({
    eyebrow: '',
    line1: '새 배너',
    line2: '문구를 입력하세요',
    sub: '',
    href: '/login',
    cta: '자세히',
    // 띠지 기본색(크림 종이·남색 글자) — AboutHero 의 --belt 와 같다
    bg: '#f6efe2',
    fg: '#14294e',
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
    .update({ ...toRow(fields), updated_at: new Date().toISOString() })
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

/**
 * 슬라이드를 그대로 복제한다 — 작년 크리스마스 표지를 올해 날짜만 바꿔 다시 쓰는 용도.
 * 복제본은 **꺼진 채** 맨 끝에 생긴다(같은 기간에 둘이 동시에 뜨지 않게). 클릭 수는 0부터.
 */
export async function duplicateSlide(id: string): Promise<void> {
  await assertAdmin();
  const supabase = createAdminClient();
  const { data: source, error: readErr } = await supabase
    .from('hero_slides')
    .select('*')
    .eq('id', id)
    .single();
  if (readErr || !source)
    throw new Error(`복제할 슬라이드를 읽지 못했습니다: ${readErr?.message}`);

  // 행 고유값(아이디·시각·클릭 수)은 새로 시작한다
  const copy: Record<string, unknown> = { ...source };
  for (const key of ['id', 'created_at', 'updated_at', 'click_count'])
    delete copy[key];
  const { error } = await supabase.from('hero_slides').insert({
    ...copy,
    sort_order: await nextSortOrder(supabase),
    is_active: false,
  });
  if (error) throw new Error(`슬라이드 복제 실패: ${error.message}`);
  revalidate();
}

/**
 * 표지 그림을 올리고 공개 주소를 돌려준다.
 *
 * 왜 서버 액션인가(HJ 11/17 A안): 버킷에 쓰기 정책을 두지 않고 service role 로만 올린다.
 * 그러면 "누가 올릴 수 있나"가 assertAdmin 한 곳에서 정해진다. 파일은 브라우저가
 * 600px WEBP 로 줄여서 보내므로 요청이 작다.
 */
export async function uploadBannerArt(formData: FormData): Promise<string> {
  await assertAdmin();
  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('파일이 없습니다.');
  const ext = ART_EXTENSION_BY_TYPE[file.type];
  if (!ext) throw new Error('PNG·WEBP·JPG 그림만 올릴 수 있습니다.');
  if (file.size > MAX_BANNER_ART_BYTES)
    throw new Error('그림이 너무 큽니다. 1MB 이하로 올려 주세요.');

  const supabase = createAdminClient();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BANNER_ART_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      // 파일 이름이 매번 새로라 내용이 바뀌지 않는다 — 오래 캐시해도 된다
      cacheControl: '31536000',
      upsert: false,
    });
  if (error) throw new Error(`그림 업로드 실패: ${error.message}`);
  return supabase.storage.from(BANNER_ART_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

export async function deleteSlide(id: string): Promise<void> {
  await assertAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from('hero_slides').delete().eq('id', id);
  if (error) throw new Error(`슬라이드 삭제 실패: ${error.message}`);
  revalidate();
}

export async function toggleActive(id: string, active: boolean): Promise<void> {
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
