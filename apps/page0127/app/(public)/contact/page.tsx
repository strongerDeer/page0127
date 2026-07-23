import { SITE_INFO } from '@/widgets/landing/model/siteInfo';
import { DocList, DocPage, DocSection } from '@/widgets/landing/ui/DocPage';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '문의 | page0127',
  description:
    'page0127 이용 중 궁금하거나 불편한 점을 카카오톡으로 편하게 문의하세요.',
};

/**
 * 문의 페이지
 *
 * 창구는 카카오톡 1:1 오픈채팅 하나로 단순하게 둔다.
 * - 별도 백엔드/폼 없이 링크만으로 동작한다.
 * - 문의가 오면 운영자가 카카오톡 알림으로 바로 받는다.
 * - 링크 값은 siteInfo.ts 한 곳에서만 관리한다.
 */
const ContactPage = () => {
  return (
    <DocPage
      title='문의'
      description='이용 중 궁금하거나 불편한 점이 있으면 편하게 남겨 주세요. 혼자 만드는 서비스라 답변이 조금 늦을 수 있어요.'
    >
      <DocSection title='카카오톡으로 문의하기'>
        <p>
          아래 버튼을 누르면 카카오톡 1:1 오픈채팅으로 연결됩니다. 카카오톡
          아이디를 서로 공개하지 않아도 대화할 수 있어요.
        </p>
        {/* 외부 링크 — 새 탭. rel은 lint 규칙(jsx-no-target-blank)이 강제한다 */}
        <a
          href={SITE_INFO.contact.kakaoOpenChatUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90'
        >
          카카오톡으로 문의하기
        </a>
      </DocSection>

      <DocSection title='문의 전에 확인해 주세요'>
        <p>더 빠르게 도와드릴 수 있도록, 문의할 때 아래를 함께 알려 주세요.</p>
        <DocList
          items={[
            '어떤 화면에서 생긴 일인지 (예: 책 등록, 취향 분석)',
            '로그인에 쓴 구글 계정 이메일 (계정 관련 문의일 때)',
            '오류라면 언제·어떻게 일어났는지',
          ]}
        />
      </DocSection>
    </DocPage>
  );
};

export default ContactPage;
