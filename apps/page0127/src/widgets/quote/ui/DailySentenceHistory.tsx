'use client';

import { useState } from 'react';

import { StatePanel } from '@repo/ui';
import { BookOpen } from 'lucide-react';

import { DailySentenceReader } from './DailySentenceReader';
import { SentenceGarden } from './SentenceGarden';

import type { DailySentence } from '@/entities/daily-sentence';

type DailySentenceHistoryProps = {
  draws: DailySentence[];
  /** 오늘(KST 'YYYY-MM-DD') — 이번 주 7칸 기준 */
  todayKey: string;
};

/**
 * "오늘의 문장" 탭 — 당근 달력 하나(HJ A안, 2026-11-26).
 * 뽑은 날마다 당근, 고른 날 문장 한 장만 아래에. 그 카드를 누르면 리더가 열리고
 * 거기서 책장 넘기듯 앞뒤로 넘겨 본다.
 */
export const DailySentenceHistory = ({
  draws,
  todayKey,
}: DailySentenceHistoryProps) => {
  // 열린 페이지의 위치(draws 안 인덱스). null 이면 닫힘
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (draws.length === 0) {
    return (
      <StatePanel
        icon={<BookOpen className='size-6' />}
        message={
          <>
            아직 펼친 오늘의 문장이 없어요.
            <br />
            서재의 독서 캘린더에서 하루에 한 번 펼칠 수 있어요.
          </>
        }
      />
    );
  }

  // 리더는 최신 → 과거 순으로 넘긴다
  const ordered = [...draws].sort((a, b) =>
    b.draw_date.localeCompare(a.draw_date)
  );
  const indexOf = new Map(ordered.map((d, i) => [d.draw_date, i]));

  return (
    <>
      <SentenceGarden
        draws={draws}
        todayKey={todayKey}
        onOpen={(draw) => setOpenIndex(indexOf.get(draw.draw_date) ?? 0)}
      />

      <DailySentenceReader
        draws={ordered}
        index={openIndex}
        onIndexChange={setOpenIndex}
      />
    </>
  );
};
