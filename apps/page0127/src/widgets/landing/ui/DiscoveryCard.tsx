import Link from 'next/link';

import { BookCover } from '@repo/ui';
import { Sparkles } from 'lucide-react';

import { createClient } from '@/shared/config/supabase/server';
import { decodeHtmlEntities } from '@/shared/lib/htmlEntities';
/**
 * "page0127의 발견" — 최근 등록된 책 한 권을 크게 보여주는 편집 카드
 *
 * 디자인 (밀리 "밀리의 발견" 카드 문법):
 * - 투톤: 위쪽은 파스텔 틴트 면 + 표지, 아래쪽은 흰 면 + 화자 라벨 + 소개 발췌
 * - 표지가 두 면의 경계에 걸친다
 * - 틴트는 책 id 해시로 4색 로테이션 (같은 책은 항상 같은 색)
 *
 * 카피:
 * - "발견"의 화자는 page0127 (00_docs/07 §5.1-② 화자 있는 섹션)
 * - 소개글은 출판사 문장을 다듬지 않고 첫 문장만 그대로 끊어 쓴다
 */

type GlobalBookRow = {
  id: string;
  title: string;
  author: string | null;
  cover_image: string | null;
  description: string | null;
};

// 종이톤 틴트 로테이션 — 책 표지를 방해하지 않도록 채도를 낮춘다.
//
// 값은 디자인 시스템(@repo/ui styles)이 갖는다. 예전에는 여기 hex 로 박혀 있었는데,
// 그러면 **다크 모드에서 면만 밝게 남아** 흰 글자가 흰 배경에 얹혔다(대비 1.12:1).
// 이제 클래스만 고르고, 다크에서 무엇으로 바뀔지는 시스템이 정한다.
const TINT_CLASSES = [
  'tint-sage',
  'tint-cool',
  'tint-warm',
  'tint-lavender',
] as const;

// 문자열 해시 → 틴트 인덱스 (같은 책은 항상 같은 색)
const tintOf = (id: string): string => {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return TINT_CLASSES[Math.abs(hash) % TINT_CLASSES.length];
};

// 소개글의 HTML 흔적을 걷어낸 뒤 첫 문장만 사용한다.
const firstSentence = (text: string): string => {
  const plainText = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  const cut = plainText.indexOf('다.');
  if (cut > 0 && cut < 90) return plainText.slice(0, cut + 2);
  return plainText.length > 70 ? `${plainText.slice(0, 70)}…` : plainText;
};

export const DiscoveryCard = async () => {
  const supabase = await createClient();

  // 소개글이 있는 최근 등록 도서 1권 — 랭킹 1위와 겹치지 않는 "새로 들어온 책"
  const { data } = await supabase
    .from('global_books')
    .select('id, title, author, cover_image, description')
    .not('description', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  const book = (data as GlobalBookRow[] | null)?.[0];
  if (!book) return null;

  const tintClass = tintOf(book.id);

  return (
    <Link
      href={`/books/info/${book.id}`}
      className='group flex w-full flex-col overflow-hidden rounded-xl border border-line transition-[transform,border-color] hover:-translate-y-0.5 hover:border-primary/30'
    >
      {/* 상단 — 틴트 면: 제목·저자(좌) + 표지(우, 경계에 걸침) */}
      <div
        className={`flex min-h-56 items-start justify-between gap-4 px-7 pt-7 ${tintClass}`}
      >
        <div className='pt-1'>
          <p className='text-lg font-bold leading-snug text-text-strong'>
            {book.title.split(' - ')[0]}
          </p>
          {book.author && (
            <p className='mt-1.5 text-sm text-text-subtle'>
              {book.author.split(',')[0].replace(/\s*\(지은이\)/, '')}
            </p>
          )}
        </div>
        {/* 표지가 없으면 아무것도 그리지 않는다 — 랜딩 카드라 빈 상자를 세우지 않는다.
            그래서 BookCover 의 대체 조판을 쓰지 않고 가드를 남긴다.
            전에 붙어 있던 rounded-md 는 뺐다 — 도메인 셰이프를 정의한 CSS 가
            레이어 밖이라 Tailwind 유틸을 이기므로 애초에 적용되지 않던 클래스다 */}
        {book.cover_image && (
          <BookCover
            src={book.cover_image}
            title={book.title}
            decorative
            className='-mb-5'
          size='xl'
        />
        )}
      </div>

      {/* 하단 — 흰 면: 화자 라벨 + 소개 발췌 */}
      <div className='bg-card px-7 pb-7 pt-9'>
        <p className='flex items-center gap-1.5 text-sm font-bold text-text-strong'>
          <Sparkles aria-hidden='true' className='size-4 text-primary' />
          page0127의 발견
        </p>
        {book.description && (
          <p className='mt-2.5 line-clamp-2 break-keep text-base leading-relaxed text-text-body'>
            {firstSentence(decodeHtmlEntities(book.description))}
          </p>
        )}
      </div>
    </Link>
  );
};
