'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { BookCover } from '@repo/ui';
import { ExternalLink, ImagePlus, Trash2, X } from 'lucide-react';

import { StoryMarkdown, storyPath } from '@/entities/story';

import { BookPicker } from '@/features/admin-sentences/ui/BookPicker';

import { deleteStory, saveStory } from '../api/storyActions';
import {
  DESCRIPTION_MAX,
  formatCharactersText,
  TITLE_MAX,
  validateSlug,
} from '../model/storyForm';
import { uploadStoryImageFile } from './uploadStoryImageFile';

import type { AdminStory } from '../api/getAdminStories';
import type { StoryInput } from '../model/storyForm';
import type { StoryImage } from '@/entities/story';
import type { PickedBook } from '@/features/admin-sentences/ui/BookPicker';

const INPUT =
  'w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm';
const LABEL = 'flex flex-col gap-1 text-sm';
const HINT = 'text-xs text-text-subtle';

/** 본문 차트 블록 예시 — "예시 넣기" 버튼이 본문 끝에 붙인다 (문법: entities/story/model/chartBlock.ts) */
const CHART_EXAMPLE = `\`\`\`chart
type: people
value: 38.5
unit: %
label: 1년에 책을 1권 이상 읽은 성인
note: 종합독서율 — 1년 동안 일반 도서를 1권 이상 읽거나 들은 사람의 비율
source: 문화체육관광부 「2025 국민 독서실태 조사」 · 2026.3.6
\`\`\``;

/** 어드민 미리보기의 내 기록 자리 — 로그인한 HJ 의 숫자 대신 자리만 보여 준다 */
const MyRecordPreview = () => (
  <div className='mt-2 rounded-2xl border border-dashed border-line p-5 text-sm text-text-subtle'>
    내 기록 칸 — 공개 페이지에서는 로그인한 사람의 올해 완독 수가, 로그인 안 한
    사람에게는 &quot;내 서재 만들기&quot; 버튼이 보여요.
  </div>
);

const CHARACTERS_PLACEHOLDER = `# 현재 · 2023
강영두: 대온실 수리 보고서를 쓰는 사람
은혜: 영두의 소꿉친구

# 낙원하숙 · 2003
안문자: 낙원하숙 주인`;

type BookState =
  | { kind: 'linked'; id: string; title: string; author: string }
  | { kind: 'picked'; book: PickedBook }
  | null;

/**
 * 책 이야기 글쓰기 — 새 글과 고치기를 함께 쓴다.
 *
 * 본문은 마크다운 + 옆 미리보기(HJ 2026-11-23 A안). 미리보기는 공개 페이지와 같은
 * StoryMarkdown 으로 그려서, 보이는 그대로 올라간다.
 * 넓은 화면(lg)은 쓰기·미리보기를 나란히, 좁은 화면은 탭으로 바꿔 본다.
 */
export const StoryEditor = ({ story }: { story: AdminStory | null }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  const [book, setBook] = useState<BookState>(
    story?.bookId
      ? {
          kind: 'linked',
          id: story.bookId,
          title: story.bookTitle,
          author: story.author,
        }
      : null
  );
  const [slug, setSlug] = useState(story?.slug ?? '');
  const [title, setTitle] = useState(story?.title ?? '');
  const [description, setDescription] = useState(story?.description ?? '');
  const [body, setBody] = useState(story?.body ?? '');
  const [rating, setRating] = useState(story?.rating ?? 0);
  const [mapImage, setMapImage] = useState<StoryImage | null>(
    story?.mapImage ?? null
  );
  const [mapCards, setMapCards] = useState<StoryImage[]>(story?.mapCards ?? []);
  const [charactersText, setCharactersText] = useState(
    story ? formatCharactersText(story.characters) : ''
  );
  const [isPublished, setIsPublished] = useState(story?.isPublished ?? false);

  const bookTitle =
    book?.kind === 'linked' ? book.title : (book?.book.book_title ?? '');
  const slugError = slug ? validateSlug(slug) : null;
  const busy = isPending || uploading;

  const onUpload = async (files: FileList | null, target: 'map' | 'cards') => {
    if (!files?.length) return;
    setUploading(true);
    setMessage(null);
    try {
      if (target === 'map') {
        const image = await uploadStoryImageFile(
          files[0],
          mapImage?.alt || (bookTitle ? `${bookTitle} 인물관계도` : '')
        );
        setMapImage(image);
      } else {
        const start = mapCards.length;
        const uploaded: StoryImage[] = [];
        for (const [index, file] of [...files].entries()) {
          uploaded.push(
            await uploadStoryImageFile(
              file,
              bookTitle ? `${bookTitle} 인물관계도 ${start + index + 1}` : ''
            )
          );
        }
        setMapCards((cards) => [...cards, ...uploaded]);
      }
    } catch (error) {
      setMessage({
        ok: false,
        text:
          error instanceof Error ? error.message : '그림을 올리지 못했어요.',
      });
    } finally {
      setUploading(false);
    }
  };

  const onSave = () => {
    const input: StoryInput = {
      id: story?.id,
      isbn: book?.kind === 'picked' ? book.book.isbn : undefined,
      bookId: book?.kind === 'linked' ? book.id : undefined,
      slug,
      title,
      description,
      body,
      rating,
      mapImage,
      mapCards,
      charactersText,
      isPublished,
    };
    setMessage(null);
    startTransition(async () => {
      const result = await saveStory(input);
      if (!result.ok) {
        setMessage({ ok: false, text: result.message });
        return;
      }
      setMessage({
        ok: true,
        text: isPublished
          ? '저장했어요. 공개 페이지에 바로 반영돼요.'
          : '초안으로 저장했어요.',
      });
      if (!story) router.replace(`/admin/stories/${result.id}`);
      else router.refresh();
    });
  };

  const onDelete = () => {
    if (!story) return;
    if (!window.confirm('이 글을 지울까요? 되돌릴 수 없어요.')) return;
    startTransition(async () => {
      const result = await deleteStory(story.id);
      if (!result.ok) {
        setMessage({ ok: false, text: result.message });
        return;
      }
      router.replace('/admin/stories');
    });
  };

  return (
    <div className='flex flex-col gap-6'>
      {/* 책 */}
      <section className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium'>책</h2>
        {book && (
          <div className='flex items-center gap-3 rounded-md border border-line p-3'>
            {book.kind === 'picked' && (
              <BookCover
                src={book.book.cover_image || null}
                title={book.book.book_title}
                size='xs'
                small
                decorative
              />
            )}
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-medium'>{bookTitle}</p>
              <p className='truncate text-xs text-text-subtle'>
                {book.kind === 'linked' ? book.author : book.book.author}
              </p>
            </div>
            {book.kind === 'linked' && (
              <Link
                href={`/books/info/${book.id}`}
                target='_blank'
                className='text-xs text-text-subtle underline'
              >
                책 정보
              </Link>
            )}
            <button
              type='button'
              onClick={() => {
                setBook(null);
                setRating(0);
              }}
              aria-label='책 연결 빼기'
              className='rounded p-1 text-text-subtle hover:bg-accent'
            >
              <X className='size-4' aria-hidden />
            </button>
          </div>
        )}
        <BookPicker
          onPick={(picked) => setBook({ kind: 'picked', book: picked })}
        />
        <p className={HINT}>
          고른 책의 책 정보 페이지에 이 글로 가는 카드가 생겨요. 독서 통계처럼
          책과 상관없는 글이면 고르지 않아도 돼요(목록에 &quot;독서
          이야기&quot;로 나와요).
        </p>
      </section>

      {/* 기본 정보 */}
      <section className='grid gap-4 sm:grid-cols-2'>
        <label className={`${LABEL} sm:col-span-2`}>
          제목
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            placeholder='대온실 수리 보고서 독후감과 인물관계도'
            className={INPUT}
          />
          <span className={HINT}>
            검색에 쓰이는 제목이에요. 사람들이 찾는 말(독후감, 인물관계도)을
            넣어 주세요.
          </span>
        </label>
        <label className={LABEL}>
          주소(영문)
          <div className='flex items-center gap-1'>
            <span className='shrink-0 text-xs text-text-subtle'>/blog/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder='daeonsil-repair-report'
              className={INPUT}
            />
          </div>
          {slugError ? (
            <span className='text-xs text-destructive'>{slugError}</span>
          ) : (
            <span className={HINT}>
              공개한 뒤에는 바꾸지 않는 게 좋아요(검색에 올라간 주소가 끊겨요).
            </span>
          )}
        </label>
        <label className={LABEL}>
          내 별점
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            disabled={!book}
            className={`${INPUT} disabled:opacity-50`}
          >
            <option value={0}>안 보이기</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)} ({n})
              </option>
            ))}
          </select>
        </label>
        <label className={`${LABEL} sm:col-span-2`}>
          소개 ({description.length}/{DESCRIPTION_MAX})
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={DESCRIPTION_MAX}
            rows={2}
            placeholder='검색 결과·공유 미리보기에 나오는 한두 문장'
            className={INPUT}
          />
        </label>
      </section>

      {/* 본문 */}
      <section className='flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <h2 className='text-sm font-medium'>본문</h2>
          <div className='flex gap-1 lg:hidden' role='tablist'>
            {(
              [
                ['write', '쓰기'],
                ['preview', '미리보기'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type='button'
                role='tab'
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`rounded px-3 py-1 text-xs ${tab === value ? 'bg-accent font-medium' : 'text-text-subtle'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className={HINT}>
          빈 줄로 문단을 나눠요. ## 소제목, &gt; 인용, **굵게**, - 목록.
          결말·인물의 정체는 쓰지 않기(스포일러 없음).
        </p>
        <p className={HINT}>
          차트: ```chart 블록에
          type(number·people·bar·column·slope·shelf·age-table·my-record)과 값을
          적으면 그림이 돼요. 출처(source)가 없으면 저장되지 않아요.{' '}
          <button
            type='button'
            onClick={() =>
              setBody((current) =>
                current.trim()
                  ? `${current.trimEnd()}\n\n${CHART_EXAMPLE}\n`
                  : `${CHART_EXAMPLE}\n`
              )
            }
            className='underline'
          >
            예시 넣기
          </button>
        </p>
        <div className='grid gap-4 lg:grid-cols-2'>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={20}
            placeholder='여기에 글을 써 주세요.'
            className={`${INPUT} font-mono leading-relaxed ${tab === 'preview' ? 'max-lg:hidden' : ''}`}
          />
          <div
            className={`min-h-40 rounded-md border border-dashed border-line p-4 ${tab === 'write' ? 'max-lg:hidden' : ''}`}
          >
            {body.trim() ? (
              <StoryMarkdown
                body={body}
                preview
                renderMyRecord={() => <MyRecordPreview />}
              />
            ) : (
              <p className={HINT}>미리보기가 여기에 보여요.</p>
            )}
          </div>
        </div>
      </section>

      {/* 인물관계도 */}
      <section className='flex flex-col gap-3'>
        <h2 className='text-sm font-medium'>인물관계도</h2>
        <div className='flex flex-wrap items-start gap-4'>
          {mapImage && (
            // 어드민 미리보기 — 원본 주소를 그대로 그린다
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mapImage.src}
              alt=''
              className='w-40 rounded-md border border-line'
            />
          )}
          <div className='flex min-w-60 flex-1 flex-col gap-2'>
            <div className='flex flex-wrap gap-2'>
              <label className='inline-flex cursor-pointer items-center gap-1 rounded-md border border-line px-3 py-2 text-sm hover:bg-accent'>
                <ImagePlus className='size-4' aria-hidden />
                {mapImage ? '전체 그림 바꾸기' : '전체 그림 올리기'}
                <input
                  type='file'
                  accept='image/png,image/webp,image/jpeg'
                  className='sr-only'
                  disabled={busy}
                  onChange={(e) => {
                    void onUpload(e.target.files, 'map');
                    e.target.value = '';
                  }}
                />
              </label>
              {mapImage && (
                <button
                  type='button'
                  onClick={() => {
                    setMapImage(null);
                    setMapCards([]);
                  }}
                  className='rounded-md border border-line px-3 py-2 text-sm text-destructive hover:bg-accent'
                >
                  그림 빼기
                </button>
              )}
            </div>
            {mapImage && (
              <label className={LABEL}>
                그림 설명(alt)
                <input
                  value={mapImage.alt}
                  onChange={(e) =>
                    setMapImage({ ...mapImage, alt: e.target.value })
                  }
                  className={INPUT}
                />
                <span className={HINT}>
                  이미지 검색에 쓰여요. 예: 대온실 수리 보고서 인물관계도 —
                  강영두를 중심으로…
                </span>
              </label>
            )}
            <p className={HINT}>
              PNG·WEBP·JPG. 올리면 긴 변 2400px WEBP 로 줄어요.{' '}
              {uploading && '올리는 중…'}
            </p>
          </div>
        </div>

        {mapImage && (
          <div className='flex flex-col gap-2 rounded-md border border-dashed border-line p-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-sm'>모바일용 카드(선택)</span>
              <label className='inline-flex cursor-pointer items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs hover:bg-accent'>
                <ImagePlus className='size-3.5' aria-hidden />
                카드 추가
                <input
                  type='file'
                  accept='image/png,image/webp,image/jpeg'
                  multiple
                  className='sr-only'
                  disabled={busy}
                  onChange={(e) => {
                    void onUpload(e.target.files, 'cards');
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <p className={HINT}>
              있으면 모바일에서 전체 그림 대신 카드를 차례로 보여 줘요(인스타
              4:5 카드 그대로 OK).
            </p>
            {mapCards.length > 0 && (
              <ul className='flex flex-wrap gap-2'>
                {mapCards.map((card, index) => (
                  <li key={card.src} className='relative'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.src}
                      alt=''
                      className='h-28 rounded border border-line'
                    />
                    <span className='absolute top-1 left-1 rounded bg-background/90 px-1 text-xs'>
                      {index + 1}
                    </span>
                    <button
                      type='button'
                      aria-label={`${index + 1}번 카드 빼기`}
                      onClick={() =>
                        setMapCards((cards) =>
                          cards.filter((_, i) => i !== index)
                        )
                      }
                      className='absolute top-1 right-1 grid size-6 place-items-center rounded bg-background/90'
                    >
                      <X className='size-3.5' aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* 등장인물 */}
      <section className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium'>등장인물(선택)</h2>
        <p className={HINT}>
          # 줄이 묶음 이름, 그 아래 “이름: 설명”. 그림 속 글자는 검색엔진이 잘
          못 읽어서, 같은 내용을 글자로도 적어 두면 좋아요.
        </p>
        <textarea
          value={charactersText}
          onChange={(e) => setCharactersText(e.target.value)}
          rows={10}
          placeholder={CHARACTERS_PLACEHOLDER}
          className={`${INPUT} font-mono`}
        />
      </section>

      {/* 저장 */}
      <section className='sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-line bg-background py-3'>
        <label className='flex items-center gap-2 text-sm'>
          <input
            type='checkbox'
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          공개
        </label>
        <button
          type='button'
          onClick={onSave}
          disabled={busy || Boolean(slugError)}
          className='rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50'
        >
          {isPending ? '저장 중…' : '저장'}
        </button>
        {story?.isPublished && (
          <Link
            href={storyPath(story.slug)}
            target='_blank'
            className='inline-flex items-center gap-1 text-sm text-text-subtle underline'
          >
            공개 페이지 보기
            <ExternalLink className='size-3.5' aria-hidden />
          </Link>
        )}
        {story && (
          <button
            type='button'
            onClick={onDelete}
            disabled={busy}
            className='ml-auto inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm text-destructive hover:bg-accent disabled:opacity-50'
          >
            <Trash2 className='size-4' aria-hidden />
            지우기
          </button>
        )}
        {message && (
          <p
            role='status'
            className={`w-full text-sm ${message.ok ? 'text-text-subtle' : 'text-destructive'}`}
          >
            {message.text}
          </p>
        )}
      </section>
    </div>
  );
};
