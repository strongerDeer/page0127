type SectionHeadProps = {
  label: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** aria-labelledby 로 섹션과 잇는 제목 id */
  id?: string;
  /** 페이지의 첫 제목일 때 h1 — 공지·업데이트 페이지는 이 머리 하나로 시작한다 */
  as?: 'h1' | 'h2';
};

/**
 * 소개 페이지 섹션 머리 — 파란 라벨 → 큰 제목 → 회색 설명, 모두 가운데.
 * 애플 제품 페이지의 문법을 그대로 따른다(제목은 마침표로 끝낸다).
 */
export const SectionHead = ({
  label,
  title,
  description,
  id,
  as: Heading = 'h2',
}: SectionHeadProps) => (
  <div className='text-center'>
    <p className='text-sm font-bold text-primary'>{label}</p>
    <Heading id={id} className='display-xl mt-2 text-balance'>
      {title}
    </Heading>
    {description && (
      <p className='mx-auto mt-4 max-w-xl text-balance text-base text-text-subtle'>
        {description}
      </p>
    )}
  </div>
);
