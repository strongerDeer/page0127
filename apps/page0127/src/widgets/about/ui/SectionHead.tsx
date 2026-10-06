type SectionHeadProps = {
  label: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** aria-labelledby 로 섹션과 잇는 제목 id */
  id?: string;
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
}: SectionHeadProps) => (
  <div className='text-center'>
    <p className='text-sm font-bold text-primary'>{label}</p>
    <h2 id={id} className='display-xl mt-2 text-balance'>
      {title}
    </h2>
    {description && (
      <p className='mx-auto mt-4 max-w-xl text-balance text-base text-text-subtle'>
        {description}
      </p>
    )}
  </div>
);
