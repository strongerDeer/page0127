'use client';

import { useEffect, useState } from 'react';

import { Card, CardContent } from '@repo/ui';

/**
 * 케미 분석을 기다리는 동안의 화면 — 두 책장이 채워지고, 겹치는 책이 파랗게 켜진다.
 *
 * 왜 '예상 단계'인가:
 * /api/compatibility/analyze 는 스트리밍이 아니라 다 끝난 뒤 JSON 을 한 번에 준다.
 * 그래서 서버의 실제 진행률은 알 수 없고, 보통 걸리는 시간(약 30초)에 맞춰
 * 문구와 그림을 넘긴다. 마지막 단계는 응답이 올 때까지 그대로 머문다.
 *
 * 책등은 실제 책이 아니라 장식이다 — 높이만 고정 배열로 정해서
 * 서버·브라우저가 같은 모양을 그린다(무작위면 hydration 이 어긋난다).
 */

/** 경과 초 → 문구. 마지막 항목은 응답이 늦을 때의 안내다 */
const STEPS = [
  { from: 0, text: '두 분의 책장을 꺼내 오고 있어요' },
  { from: 6, text: '겹치는 책과 관심사를 찾고 있어요' },
  { from: 14, text: '서로 다른 결을 살펴보고 있어요' },
  { from: 22, text: '서로에게 건넬 책을 고르고 있어요' },
  { from: 40, text: '생각보다 오래 걸리고 있어요. 조금만 더 기다려 주세요' },
] as const;

/** 책등 높이(%) — 한 칸에 14권. 두 사람의 책장이 똑같아 보이지 않게 따로 둔다 */
const SPINE_HEIGHTS = {
  me: [74, 62, 88, 70, 82, 58, 78, 92, 66, 84, 60, 76, 86, 68],
  target: [66, 80, 72, 90, 60, 76, 86, 64, 82, 70, 88, 62, 74, 84],
} as const;
const SPINE_COUNT = SPINE_HEIGHTS.me.length;

/** 두 책장에서 '겹치는 책'으로 파랗게 켜질 자리 */
const MATCH_INDEXES = new Set([2, 6, 9, 12]);

/**
 * 책장이 곧 진행 막대다 — 책등이 한 권씩 꽂히며 왼쪽부터 채워진다.
 * 2초에 한 권씩, 보통 걸리는 30초 동안 13권까지 선다.
 * 마지막 한 칸은 비워 둔다: 실제 진행률이 아니라서 응답 전에 '100%'를 보여 주면 거짓이 된다
 * (응답이 오면 결과 화면으로 바뀌므로 꽉 찬 책장은 결과가 대신한다).
 */
const SPINE_INTERVAL = 2.2;
const MAX_VISIBLE = SPINE_COUNT - 1;

const TICK_MS = 250;

type ChemistryLoadingProps = {
  targetName: string;
  /** 이미 흐른 시간(초) — 스토리북에서 중간·늦은 상태를 바로 보려고 둔다. 앱에서는 0 */
  initialElapsed?: number;
};

export const ChemistryLoading = ({
  targetName,
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

  const step = STEPS.findLast((s) => elapsed >= s.from) ?? STEPS[0];
  const visibleSpines = Math.min(
    MAX_VISIBLE,
    Math.floor(elapsed / SPINE_INTERVAL) + 1
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
        <div aria-hidden className='mx-auto mb-6 w-full max-w-sm space-y-2'>
          {shelves.map((shelf) => (
            <div key={shelf.key}>
              <p className='mb-1 text-center text-xs text-text-subtle'>
                {shelf.label}
              </p>
              <div className='flex h-16 items-end justify-center gap-1 border-b-2 border-line px-2'>
                {SPINE_HEIGHTS[shelf.key].map((height, i) => {
                  const isVisible = i < visibleSpines;
                  const isLit = isVisible && MATCH_INDEXES.has(i);
                  return (
                    <span
                      key={i}
                      style={{ height: `${height}%` }}
                      className={[
                        'w-3.5 rounded-t-sm transition-all duration-500 motion-reduce:transition-none',
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
          {step.text}…
        </p>
        <p className='mt-2 text-sm text-text-subtle'>
          보통 30초쯤 걸려요. 창을 닫지 말고 기다려 주세요.
        </p>
      </CardContent>
    </Card>
  );
};
