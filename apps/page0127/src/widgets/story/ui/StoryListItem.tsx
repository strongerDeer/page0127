import Image from 'next/image';
import Link from 'next/link';

import {
  formatStoryShortDate,
  storyKindLabel,
  storyPath,
} from '@/entities/story';
import { formatChartValue } from '@/entities/story/model/chartBlock';

import type { StorySummary } from '@/entities/story';

/**
 * 책 이야기 목록 한 줄 (리스트형, HJ 2026-11-24) — 제목·소개·날짜가 주인공.
 *
 * 오른쪽 작은 그림은 이 순서로 고른다:
 *   ① 대표 이미지(어드민에서 고른 위치로 정사각형 자르기, HJ 2026-11-27)
 *   ② 관계도 그림 윗부분  ③ 본문 첫 차트의 큰 숫자(lead_stat)  ④ 모두 없으면 칸 없음
 */
const SIDE =
  'size-[84px] shrink-0 overflow-hidden rounded-xl border border-line-soft sm:size-28';

const PEOPLE_DOTS = 5;

const LeadStatThumb = ({
  stat,
}: {
  stat: NonNullable<StorySummary['leadStat']>;
}) => {
  // 10명 기준 값을 5칸으로 줄여 그린다(작은 칸에서 10명은 너무 촘촘하다)
  const filled = stat.people === null ? null : stat.people / 2;
  return (
    <div
      aria-hidden
      className={`${SIDE} tint-cool flex flex-col items-center justify-center gap-1.5`}
    >
      <b className='text-xl leading-none tabular-nums text-text-strong sm:text-2xl'>
        {formatChartValue(stat.value)}
        <span className='text-sm'>{stat.unit}</span>
      </b>
      {filled !== null && (
        <span className='grid w-14 grid-cols-5 gap-0.5'>
          {Array.from({ length: PEOPLE_DOTS }, (_, index) => (
            <span
              key={index}
              className='block aspect-[3/5] overflow-hidden rounded-t-[4px] rounded-b-[1px] bg-text-subtle/25'
            >
              <span
                className='block h-full bg-primary'
                style={{
                  width: `${Math.max(0, Math.min(1, filled - index)) * 100}%`,
                }}
              />
            </span>
          ))}
        </span>
      )}
    </div>
  );
};

export const StoryListItem = ({
  story,
  headingLevel = 'h2',
}: {
  story: StorySummary;
  /** 목록 페이지는 h2, 글 아래 "다른 이야기"는 h3 */
  headingLevel?: 'h2' | 'h3';
}) => {
  const Heading = headingLevel;
  const meta = [story.author, formatStoryShortDate(story.publishedAt)]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      href={storyPath(story.slug)}
      className='group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 py-5'
    >
      <div className='flex min-w-0 flex-col gap-1.5'>
        <span className='text-xs font-semibold text-primary'>
          {storyKindLabel(story)}
        </span>
        <Heading className='text-lg leading-snug font-semibold break-keep text-text-strong group-hover:underline group-hover:underline-offset-4'>
          {story.title}
        </Heading>
        {story.description && (
          <p className='line-clamp-2 text-sm break-keep text-text-subtle'>
            {story.description}
          </p>
        )}
        <p className='text-sm text-text-subtle'>{meta}</p>
      </div>
      {story.coverImage ? (
        <div className={SIDE}>
          <Image
            src={story.coverImage.src}
            width={story.coverImage.width}
            height={story.coverImage.height}
            alt=''
            unoptimized
            className='size-full object-cover'
            // 위치는 DB CHECK·toCoverPosition 이 "가로% 세로%"만 통과시킨 값이다
            style={{ objectPosition: story.coverPosition }}
          />
        </div>
      ) : story.mapImage ? (
        <div className={SIDE}>
          <Image
            src={story.mapImage.src}
            width={story.mapImage.width}
            height={story.mapImage.height}
            alt=''
            unoptimized
            className='size-full object-cover object-top'
          />
        </div>
      ) : story.leadStat ? (
        <LeadStatThumb stat={story.leadStat} />
      ) : null}
    </Link>
  );
};
