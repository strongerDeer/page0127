'use client';

import {
  type AnalysisLoadingStep,
  AnalysisShelfLoading,
} from '@/shared/ui/AnalysisShelfLoading';

/**
 * 취향 분석을 기다리는 동안의 화면 — 내 책장이 진행률만큼 차오르고, 결이 맞는 책이 파랗게 켜진다.
 * 케미 분석(ChemistryLoading)과 같은 책장 그림이다(2026-11-28 HJ A안: 두 로딩 통일).
 */

/**
 * 진행률 → 문구. AI 가 쓰는 순서(성향 → 좋아한·아쉬웠던 결 → 근거 책 → 추천 → 저장 → 표지)와 맞춘다.
 * 전체 진행률 기준이다: AI 구간 5~85% 안에서 TASTE_ANALYSIS_PROGRESS 이정표를 환산한 값.
 */
const STEPS: readonly AnalysisLoadingStep[] = [
  { from: 0, text: '책장을 꺼내 오고 있어요' },
  { from: 0.08, text: '어떤 독자인지 읽고 있어요' },
  { from: 0.29, text: '좋아한 책과 아쉬웠던 책의 결을 비교하고 있어요' },
  { from: 0.39, text: '근거가 될 책을 고르고 있어요' },
  { from: 0.49, text: '다음에 읽을 책을 고르고 있어요' },
  { from: 0.85, text: '결과를 정리하고 있어요' },
  { from: 0.92, text: '추천 책 표지를 찾고 있어요' },
];

/** 책등 높이(%) — 케미 책장과 같은 14칸 */
const SHELF = [70, 84, 62, 90, 74, 66, 86, 58, 80, 72, 92, 64, 78, 68];

/** '결이 맞는 책'으로 파랗게 켜질 자리 */
const TASTE_INDEXES = new Set([1, 4, 7, 10, 12]);

type TasteAnalysisLoadingProps = {
  /** 전체 진행률 0~1 — 서버 스트림에서 온다 */
  progress: number;
  /** 이미 흐른 시간(초) — 스토리북에서 늦은 상태를 바로 보려고 둔다. 앱에서는 0 */
  initialElapsed?: number;
};

export const TasteAnalysisLoading = ({
  progress,
  initialElapsed,
}: TasteAnalysisLoadingProps) => (
  <AnalysisShelfLoading
    title='책장에서 취향을 읽고 있어요'
    shelves={[{ key: 'me', heights: SHELF }]}
    litIndexes={TASTE_INDEXES}
    steps={STEPS}
    progress={progress}
    note='보통 30초쯤, 길면 1분 걸려요. 화면을 벗어나지 말고 기다려 주세요.'
    initialElapsed={initialElapsed}
  />
);
