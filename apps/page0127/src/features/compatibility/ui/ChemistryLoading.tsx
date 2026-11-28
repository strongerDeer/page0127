'use client';

import { useEffect, useState } from 'react';

import { Card, CardContent } from '@repo/ui';

/**
 * 케미 분석을 기다리는 동안의 화면 — 두 책장이 채워지고, 겹치는 책이 파랗게 켜진다.
 *
 * 진행률은 서버가 실시간으로 알려 준다(2026-11-27, NDJSON 스트림):
 * /api/compatibility/analyze 가 AI 가 답을 얼마나 썼는지 줄마다 보내고,
 * postAnalysisStream 이 그걸 0~1 전체 진행률로 바꿔 progress 로 넘긴다.
 * 예전엔 시간으로 짐작만 해서 마지막 한 칸을 비워 뒀는데, 이제는 실제로 다 차면 끝난 것이다.
 *
 * 책등은 실제 책이 아니라 장식이다 — 높이만 고정 배열로 정해서
 * 서버·브라우저가 같은 모양을 그린다(무작위면 hydration 이 어긋난다).
 */

/** 진행률 → 문구. AI 가 쓰는 순서(설명 → 공통점·차이점 → 서로 권할 책 → 저장)와 맞춘다 */
const STEPS = [
  { from: 0, text: '두 분의 책장을 꺼내 오고 있어요' },
  { from: 0.15, text: '겹치는 책과 관심사를 찾고 있어요' },
  { from: 0.35, text: '서로 다른 결을 살펴보고 있어요' },
  { from: 0.55, text: '서로에게 건넬 책을 고르고 있어요' },
  { from: 0.85, text: '결과를 정리하고 있어요' },
] as const;

/** 이 시간(초)이 넘으면 진행률과 상관없이 늦어짐 안내를 보인다 */
const SLOW_AFTER_SECONDS = 40;
const SLOW_TEXT = '생각보다 오래 걸리고 있어요. 조금만 더 기다려 주세요';

/** 책등 높이(%) — 한 칸에 14권. 두 사람의 책장이 똑같아 보이지 않게 따로 둔다 */
const SPINE_HEIGHTS = {
  me: [74, 62, 88, 70, 82, 58, 78, 92, 66, 84, 60, 76, 86, 68],
  target: [66, 80, 72, 90, 60, 76, 86, 64, 82, 70, 88, 62, 74, 84],
} as const;
const SPINE_COUNT = SPINE_HEIGHTS.me.length;

/** 두 책장에서 '겹치는 책'으로 파랗게 켜질 자리 */
const MATCH_INDEXES = new Set([2, 6, 9, 12]);

/**
 * 책장이 곧 진행 막대다 — 진행률만큼 책등이 왼쪽부터 꽂힌다.
 * 시작하자마자 한 권은 세워 둔다(빈 책장은 멈춤으로 읽힌다).
 */
const TICK_MS = 500;

type ChemistryLoadingProps = {
  targetName: string;
  /** 전체 진행률 0~1 — 서버 스트림에서 온다 */
  progress: number;
  /** 이미 흐른 시간(초) — 스토리북에서 늦은 상태를 바로 보려고 둔다. 앱에서는 0 */
  initialElapsed?: number;
};

export const ChemistryLoading = ({
  targetName,
  progress,
  initialElapsed = 0,
}: ChemistryLoadingProps) => {
  // 경과 시간(초). 이 컴포넌트는 분석 중에만 마운트되므로 마운트 시점이 곧 시작 시점이다
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
      : (STEPS.findLast((s) => progress >= s.from) ?? STEPS[0]).text;
  const visibleSpines = Math.max(
    1,
    Math.min(SPINE_COUNT, Math.round(progress * SPINE_COUNT))
  );

  const shelves = [
    { key: 'me', label: '나' },
    { key: 'target', label: `${targetName} 님` },
  ] as const;

  return (
    <Card>
      <CardContent className='py-12 text-center'>
        <h2 className='mb-8 heading-2'>두 분의 책장을 나란히 읽고 있어요</h2>

        {/* 그림은 장식이라 스크린 리더에서 숨기고, 아래 문구만 읽힌다 */}
        <div aria-hidden className='mx-auto mb-6 w-full max-w-56 space-y-1.5'>
          {shelves.map((shelf) => (
            <div key={shelf.key}>
              <p className='mb-1 text-center text-xs text-text-subtle'>
                {shelf.label}
              </p>
              <div className='flex h-10 items-end justify-center gap-0.5 border-b-2 border-line px-1'>
                {SPINE_HEIGHTS[shelf.key].map((height, i) => {
                  const isVisible = i < visibleSpines;
                  const isLit = isVisible && MATCH_INDEXES.has(i);
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
          ))}
        </div>

        {/* 문구가 바뀔 때 스크린 리더가 읽도록 polite live region */}
        <p
          role='status'
          aria-live='polite'
          className='min-h-6 font-medium text-text-strong'
        >
          {stepText}…
        </p>
        <p className='mt-2 text-sm text-text-subtle'>
          보통 30초쯤 걸려요. 창을 닫지 말고 기다려 주세요.
        </p>
      </CardContent>
    </Card>
  );
};
