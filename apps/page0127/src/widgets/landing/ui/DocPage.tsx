import { PageContainer } from '@/shared/ui/PageContainer';

import { SITE_INFO } from '@/widgets/landing/model/siteInfo';
import { SiteFooter } from '@/widgets/landing/ui/SiteFooter';

/**
 * 정적 문서 페이지 공통 껍데기 (소개·약관·개인정보·문의)
 *
 * 이 페이지들이 "🚧 준비 중" 스텁이던 것은 디자인 문제가 아니라 신뢰 문제였다.
 * 개인정보처리방침은 소셜 로그인 + 개인 데이터를 다루는 이상 법적 의무이기도 하다.
 */
type DocPageProps = {
  title: string;
  description?: string;
  /** 최종 수정일을 노출할지 — 약관·개인정보처럼 개정 이력이 중요한 문서만 */
  showUpdatedAt?: boolean;
  children: React.ReactNode;
};

export const DocPage = ({
  title,
  description,
  showUpdatedAt,
  children,
}: DocPageProps) => {
  return (
    <>
      <PageContainer width='content'>
        <header className='mb-10 border-b border-line pb-6'>
          <h1 className='heading-1 text-text-strong'>{title}</h1>
          {description && <p className='mt-2 text-text-body'>{description}</p>}
          {showUpdatedAt && (
            <p className='mt-3 text-xs text-text-faint'>
              최종 수정일: {SITE_INFO.lastUpdated}
            </p>
          )}
        </header>

        <div className='space-y-10 pb-16'>{children}</div>
      </PageContainer>

      <SiteFooter />
    </>
  );
};

/** 문서 안의 한 절 */
type DocSectionProps = {
  title: string;
  children: React.ReactNode;
};

export const DocSection = ({ title, children }: DocSectionProps) => (
  <section>
    <h2 className='heading-2 mb-3 text-text-strong'>{title}</h2>
    <div className='space-y-3 leading-relaxed text-text-body'>{children}</div>
  </section>
);

/** 문서 안의 목록 */
export const DocList = ({ items }: { items: React.ReactNode[] }) => (
  <ul className='space-y-1.5'>
    {items.map((item, i) => (
      <li key={i} className='flex gap-2'>
        <span className='select-none text-text-faint'>·</span>
        <span className='flex-1'>{item}</span>
      </li>
    ))}
  </ul>
);
