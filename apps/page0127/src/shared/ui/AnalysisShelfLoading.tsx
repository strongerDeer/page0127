'use client';

import { useEffect, useState } from 'react';

import { Card, CardContent } from '@repo/ui';

/**
 * AI 분석을 기다리는 동안의 화면 — 책장이 진행 막대 대신 차오른다.
 *
 * 취향 분석과 독서 케미가 같이 쓴다(2026-11-28 HJ: 두 로딩이 달라 보인다 → 케미의 책장 그림으로 통일).
 * 진행률은 서버가 실시간으로 보낸다(NDJSON 스트림 → postAnalysisStream → 0~1).
 * 그래서 책장이 끝까지 차면 정말로 끝난 것이다.
 *
 * 책등은 실제 책이 아니라 장식이다 — 높이만 고정 배열로 정해서
 * 서버·브라우저가 같은 모양을 그린다(무작위면 hydration 이 어긋난다).
 */

export type AnalysisShelf = {
  key: string;
  /** 책장 위 이름표 — 책장이 하나뿐이면 비워 둔다 */
  label?: string;
  /** 책등 높이(%) — 길이가 곧 책장 칸 수 */
  heights: readonly number[];
};

export type AnalysisLoadingStep = {
  /** 이 진행률(0~1)부터 이 문구를 보인다 */
  from: number;
  text: string;
};

/** 이 시간(초)이 넘으면 진행률과 상관없이 늦어짐 안내를 보인다 */
const SLOW_AFTER_SECONDS = 40;
const SLOW_TEXT = '생각보다 오래 걸리고 있어요. 조금만 더 기다려 주세요';
const TICK_MS = 500;

type AnalysisShelfLoadingProps = {
  title: string;
  shelves: readonly AnalysisShelf[];
  /** 파랗게 켜질 자리(책장마다 같은 자리) — 케미는 겹치는 책, 취향은 결이 맞는 책 */
  litIndexes: ReadonlySet<number>;
  /** 진행률 → 문구. from 이 커지는 순서로 */
  steps: readonly AnalysisLoadingStep[];
  /** 전체 진행률 0~1 — 서버 스트림에서 온다 */
  progress: number;
  /** 문구 아래 작은 안내 */
  note: string;
  /** 이미 흐른 시간(초) — 스토리북에서 늦은 상태를 바로 보려고 둔다. 앱에서는 0 */
  initialElapsed?: number;
};

export const AnalysisShelfLoading = ({
  title,
  shelves,
  litIndexes,
  steps,
  progress,
  note,
  initialElapsed = 0,
}: AnalysisShelfLoadingProps) => {
  // 경과 시간(초). 분석 중에만 마운트되므로 마운트 시점이 곧 시작 시점이다
  const [elapsed, setElapsed] = useState(initialElapsed);

  useEffect(() => {
    const startedAt = Date.now() - initialElapsed * 1000;
    const id = window.setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [initialElapsed]);

  const stepText =
    elapsed >= SLOW_AFTER_SECONDS
      ? SLOW_TEXT
      : (steps.findLast((s) => progress >= s.from) ?? steps[0])?.text;

  return (
    <Card>
      <CardContent className='py-12 text-center'>
        <h2 className='mb-8 heading-2'>{title}</h2>

        {/* 그림은 장식이라 스크린 리더에서 숨기고, 아래 문구만 읽힌다 */}
        <div aria-hidden className='mx-auto mb-6 w-full max-w-56 space-y-1.5'>
          {shelves.map((shelf) => {
            const count = shelf.heights.length;
            // 책장이 곧 진행 막대 — 시작하자마자 한 권은 세워 둔다(빈 책장은 멈춤으로 읽힌다)
            const visible = Math.max(
              1,
              Math.min(count, Math.round(progress * count))
            );
            return (
              <div key={shelf.key}>
                {shelf.label && (
                  <p className='mb-1 text-center text-xs text-text-subtle'>
                    {shelf.label}
                  </p>
                )}
                <div className='flex h-10 items-end justify-center gap-0.5 border-b-2 border-line px-1'>
                  {shelf.heights.map((height, i) => {
                    const isVisible = i < visible;
                    const isLit = isVisible && litIndexes.has(i);
                    return (
                      <span
                        key={i}
                        style={{ height: `${height}%` }}
                        className={[
                          'w-2 rounded-t-[1px] transition-all duration-500 motion-reduce:transition-none',
                          // 빈 자리는 옅은 윤곽만 — 남은 칸이 보여야 '얼마나 남았나'가 읽힌다
                          isVisible
                            ? isLit
                              ? 'bg-primary'
                              : 'bg-text-subtle/35'
                            : 'border border-dashed border-line',
                        ].join(' ')}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 문구가 바뀔 때 스크린 리더가 읽도록 polite live region */}
        <p
          role='status'
          aria-live='polite'
          className='min-h-6 font-medium text-text-strong'
        >
          {stepText}…
        </p>
        <p className='mt-2 text-sm text-text-subtle'>{note}</p>
      </CardContent>
    </Card>
  );
};
