import { detectEnvironmentChanges } from '@repo/quality/environment';

import type { QualityRecord } from '@repo/quality/types';

type Props = {
  record: QualityRecord;
  // 직전 측정. 측정 환경(Chrome·Lighthouse)이 바뀌었는지 비교하는 데만 쓴다.
  previous?: QualityRecord;
};

export const RegressionBanner = ({ record, previous }: Props) => {
  const regressions = record.regressions ?? [];
  if (regressions.length === 0) return null;

  // 환경이 바뀐 주엔 TBT·점수가 도구 탓으로 크게 출렁인다(10/1 Chrome 업데이트만으로
  // 모바일 점수 9~20점 하락). 예전엔 이 사실이 자연어 분석에만 있어서, 분석이
  // 실패하면(키 오류 등) 회귀 목록만 보고 코드 탓으로 오해하기 쉬웠다.
  const envChanges = previous ? detectEnvironmentChanges(previous, record) : [];

  return (
    <section className='rounded-lg border border-red-300 bg-red-50 p-4'>
      <h2 className='mb-2 text-sm font-medium text-red-700'>
        회귀 {regressions.length}건 감지
      </h2>
      <ul className='list-disc space-y-1 pl-5 text-sm text-red-700'>
        {regressions.map((r, i) => (
          <li key={i}>{r.detail}</li>
        ))}
      </ul>
      {envChanges.length > 0 && (
        <p className='mt-3 text-xs text-red-700'>
          측정 환경이 바뀌었어요 ({envChanges.join(' · ')}). 성능 점수·LCP·TBT
          변동은 코드가 아니라 환경 영향일 수 있어요. 전송량·번들 변화는 그대로
          믿어도 됩니다.
        </p>
      )}
    </section>
  );
};
