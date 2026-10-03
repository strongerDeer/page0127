type SetupNoticeProps = {
  source: 'GA4' | 'Search Console';
  missing?: string[];
  error?: string;
};

/**
 * 연동이 안 됐을 때 "무엇이 없어서 못 하는지"를 그대로 말한다.
 * 변수 이름만 보여 주고 값은 절대 싣지 않는다.
 */
export const SetupNotice = ({ source, missing, error }: SetupNoticeProps) => (
  <div className='rounded-lg border border-line p-4 text-sm'>
    {missing ? (
      <>
        <p className='font-medium'>{source} 연결 설정이 필요합니다</p>
        <p className='mt-1 text-text-subtle'>서버 환경변수가 비어 있습니다:</p>
        {/* 칩 사이에 공백이 없으면 줄바꿈 지점이 없어 카드 밖으로 넘친다 — flex-wrap 으로 감싼다 */}
        <div className='mt-1 flex flex-wrap gap-1'>
          {missing.map((name) => (
            <code key={name} className='rounded bg-accent px-1 text-xs'>
              {name}
            </code>
          ))}
        </div>
      </>
    ) : (
      <>
        <p className='font-medium text-destructive'>{source} 조회 실패</p>
        {/* 403 이면 서비스 계정을 GA 속성·Search Console 사용자로 추가했는지 먼저 본다 */}
        <p className='mt-1 break-all text-xs text-text-subtle'>{error}</p>
      </>
    )}
  </div>
);
