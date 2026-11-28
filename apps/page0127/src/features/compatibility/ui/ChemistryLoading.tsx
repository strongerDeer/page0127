'use client';

import {
  type AnalysisLoadingStep,
  AnalysisShelfLoading,
} from '@/shared/ui/AnalysisShelfLoading';

/**
 * 케미 분석을 기다리는 동안의 화면 — 두 책장이 채워지고, 겹치는 책이 파랗게 켜진다(11/24 HJ C안).
 * 그림·늦어짐 안내는 취향 분석과 같은 AnalysisShelfLoading 을 쓴다(11/28 통일).
 */

/** 진행률 → 문구. AI 가 쓰는 순서(설명 → 공통점·차이점 → 서로 권할 책 → 저장)와 맞춘다 */
const STEPS: readonly AnalysisLoadingStep[] = [
  { from: 0, text: '두 분의 책장을 꺼내 오고 있어요' },
  { from: 0.15, text: '겹치는 책과 관심사를 찾고 있어요' },
  { from: 0.35, text: '서로 다른 결을 살펴보고 있어요' },
  { from: 0.55, text: '서로에게 건넬 책을 고르고 있어요' },
  { from: 0.85, text: '결과를 정리하고 있어요' },
];

/** 책등 높이(%) — 한 칸에 14권. 두 사람의 책장이 똑같아 보이지 않게 따로 둔다 */
const ME = [74, 62, 88, 70, 82, 58, 78, 92, 66, 84, 60, 76, 86, 68];
const TARGET = [66, 80, 72, 90, 60, 76, 86, 64, 82, 70, 88, 62, 74, 84];

/** 두 책장에서 '겹치는 책'으로 파랗게 켜질 자리 */
const MATCH_INDEXES = new Set([2, 6, 9, 12]);

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
  initialElapsed,
}: ChemistryLoadingProps) => (
  <AnalysisShelfLoading
    title='두 분의 책장을 나란히 읽고 있어요'
    shelves={[
      { key: 'me', label: '나', heights: ME },
      { key: 'target', label: `${targetName} 님`, heights: TARGET },
    ]}
    litIndexes={MATCH_INDEXES}
    steps={STEPS}
    progress={progress}
    note='보통 30초쯤 걸려요. 창을 닫지 말고 기다려 주세요.'
    initialElapsed={initialElapsed}
  />
);
