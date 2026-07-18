import Image from 'next/image';

import { BookOpen, FileText, Pencil, Star, Trophy } from 'lucide-react';

import { Button } from '@/shared/ui/button';

import type { Book } from '@/entities/book';

type ReadingProgressOverviewProps = {
  year: number;
  completed: number;
  target: number;
  totalPages: number;
  averageRating: number;
  favoriteBooks: number;
  books: Book[];
  onSetGoal?: () => void;
};

const Metric = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className='min-w-0'>
    <div className='mb-1 flex items-center gap-1.5 text-xs font-medium text-text-subtle'>
      {icon}
      {label}
    </div>
    <p className='truncate text-lg font-bold tracking-tight text-text-strong'>
      {value}
    </p>
  </div>
);

export const ReadingProgressOverview = ({
  year,
  completed,
  target,
  totalPages,
  averageRating,
  favoriteBooks,
  books,
  onSetGoal,
}: ReadingProgressOverviewProps) => {
  const hasGoal = target > 0;
  const progress = hasGoal
    ? Math.min(Math.round((completed / target) * 100), 100)
    : 0;
  const remaining = Math.max(target - completed, 0);
  const coverBooks = books.filter((book) => book.cover_image).slice(0, 3);
  const milestone = hasGoal ? Math.max(Math.ceil(target / 2), 1) : 0;

  const headline = !hasGoal
    ? `${completed}권의 기록이 쌓였어요`
    : remaining === 0
      ? '올해의 독서 목표를 완주했어요'
      : `목표까지 ${remaining}권 남았어요`;

  return (
    <section className='overflow-hidden rounded-[28px] border border-line-soft bg-card'>
      <div className='grid lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]'>
        <div className='p-6 sm:p-8 lg:p-10'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
              <p className='flex items-center gap-2 text-sm font-semibold text-primary'>
                <BookOpen className='size-4' />
                {year} 독서 여정
              </p>
              <h2 className='mt-3 break-keep text-2xl font-bold tracking-tight text-text-strong sm:text-3xl'>
                {headline}
              </h2>
              <p className='mt-2 text-sm text-text-subtle'>
                {hasGoal
                  ? `${target}권 목표 중 ${completed}권을 완독했습니다.`
                  : '목표를 정하면 읽어온 과정을 더 선명하게 확인할 수 있어요.'}
              </p>
            </div>

            {onSetGoal && (
              <Button
                variant='ghost'
                size='sm'
                className='text-text-subtle'
                onClick={onSetGoal}
              >
                <Pencil className='size-3.5' />
                {hasGoal ? '목표 수정' : '목표 설정'}
              </Button>
            )}
          </div>

          <div className='mt-8'>
            <div className='mb-3 flex items-end justify-between gap-4'>
              <div className='flex items-baseline gap-2'>
                <strong className='text-4xl font-bold tracking-[-0.04em] text-text-strong'>
                  {hasGoal ? progress : completed}
                </strong>
                <span className='font-semibold text-text-subtle'>
                  {hasGoal ? '%' : '권 완독'}
                </span>
              </div>
              {hasGoal && (
                <span className='text-sm font-medium text-text-subtle'>
                  {completed} / {target}권
                </span>
              )}
            </div>

            <div className='relative h-3 overflow-hidden rounded-full bg-sunken'>
              <div
                className='h-full rounded-full bg-primary transition-[width] duration-500'
                style={{ width: `${hasGoal ? progress : 0}%` }}
              />
            </div>

            {hasGoal && (
              <div className='mt-3 grid grid-cols-3 text-xs text-text-faint'>
                <span>시작</span>
                <span className='text-center'>{milestone}권 · 절반</span>
                <span className='text-right'>{target}권 · 목표</span>
              </div>
            )}
          </div>

          <div className='mt-9 grid grid-cols-3 divide-x divide-line-soft'>
            <div className='pr-4'>
              <Metric
                icon={<FileText className='size-3.5' />}
                label='읽은 쪽수'
                value={`${totalPages.toLocaleString()}쪽`}
              />
            </div>
            <div className='px-4'>
              <Metric
                icon={<Star className='size-3.5' />}
                label='평균 평점'
                value={
                  averageRating > 0 ? `${averageRating.toFixed(1)}점` : '—'
                }
              />
            </div>
            <div className='pl-4'>
              <Metric
                icon={<Trophy className='size-3.5' />}
                label='인생 책'
                value={`${favoriteBooks}권`}
              />
            </div>
          </div>
        </div>

        <div className='relative min-h-64 overflow-hidden bg-[#eef1f5] lg:min-h-full'>
          <div className='absolute inset-x-0 top-6 text-center'>
            <p className='text-xs font-semibold tracking-[0.18em] text-text-faint'>
              BOOKS OF {year}
            </p>
          </div>

          {coverBooks.length > 0 ? (
            <div className='absolute inset-x-0 bottom-8 flex h-48 items-end justify-center px-6'>
              {coverBooks.map((book, index) => {
                const position = [
                  '-mr-5 translate-y-3 -rotate-6',
                  'z-10',
                  '-ml-5 translate-y-2 rotate-6',
                ][index];

                return (
                  <div
                    key={book.id}
                    className={`relative aspect-[2/3] h-40 overflow-hidden rounded-sm border border-white/80 bg-card shadow-[0_18px_36px_rgba(15,35,68,0.16)] sm:h-44 ${position}`}
                  >
                    <Image
                      src={book.cover_image!}
                      alt={book.title}
                      fill
                      sizes='120px'
                      className='object-cover'
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className='absolute inset-0 flex flex-col items-center justify-center pt-8 text-center'>
              <div className='flex size-16 items-center justify-center rounded-full bg-card text-primary'>
                <BookOpen className='size-7' />
              </div>
              <p className='mt-4 text-sm font-medium text-text-subtle'>
                올해의 책이 이곳에 쌓입니다
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
