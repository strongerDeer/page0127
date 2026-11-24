import { ShareBars } from './ShareBars';

import type { SignupChannelsResult } from '../api/getSignupChannels';

/**
 * "가입한 사람은 어디서 왔나?" — GA(방문)가 아니라 우리 DB 의 실제 가입자 기준.
 * 기록은 2026-11-24 배포부터라 그 전 가입자는 '기록 없음'으로 맨 아래에 모인다.
 */
export const SignupChannelPanel = ({
  result,
}: {
  result: SignupChannelsResult;
}) => {
  if (result.status === 'error') {
    return (
      <p className='rounded-lg border border-line p-4 text-sm text-text-subtle'>
        가입 출처를 불러오지 못했습니다. (가입 0명과는 다른 상태입니다 — DB
        마이그레이션 적용 여부와 서버 로그를 확인하세요.)
      </p>
    );
  }
  return (
    <ShareBars
      title={`이 기간 가입자 ${result.total}명이 처음 들어온 길`}
      caption='첫 방문 때 출처를 기억했다가 가입할 때 저장합니다. 운영자·체험·테스트 계정 제외. 2026-11-24 전 가입자는 기록 없음.'
      items={result.rows.map((r) => ({
        key: r.channel,
        label: r.channel,
        value: r.count,
        display: `${r.count}명`,
      }))}
      emptyText='이 기간 가입자 없음'
    />
  );
};
