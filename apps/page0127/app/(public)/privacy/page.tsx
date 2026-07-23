import Link from 'next/link';

import { DocList, DocPage, DocSection } from '@/widgets/landing/ui/DocPage';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 | page0127',
  description:
    'page0127이 수집하는 개인정보와 처리 방식, 이용자의 권리를 안내합니다.',
};

/**
 * 개인정보처리방침
 *
 * 코드에서 실제로 확인한 처리 내역만 적는다. 지어내지 않는다.
 * - 인증: Supabase Auth + Google OAuth
 * - 저장: Supabase(Postgres, Storage)
 * - 호스팅: Vercel
 * - AI 분석: OpenAI
 * - 도서 정보: 알라딘 API
 * - 사용 통계: Google Analytics 4 (NEXT_PUBLIC_GA_ID 설정 시)
 * - 개인정보 문의: 카카오톡 1:1 오픈채팅(/contact)
 */
const PrivacyPage = () => {
  return (
    <DocPage
      title='개인정보처리방침'
      description='page0127은 서비스에 꼭 필요한 정보만 받고, 탈퇴하면 남김없이 지웁니다.'
      showUpdatedAt
    >
      <DocSection title='1. 수집하는 정보'>
        <p className='font-medium text-text-strong'>
          구글 계정으로 로그인할 때
        </p>
        <DocList
          items={['이메일 주소', '이름과 프로필 사진 (구글 계정에 등록된 것)']}
        />
        <p className='mt-4 font-medium text-text-strong'>
          서비스를 쓰면서 직접 남기는 것
        </p>
        <DocList
          items={[
            '닉네임, 사용자명(공개 서재 주소에 쓰입니다), 프로필 사진',
            '읽은 책의 기록 — 책 정보, 별점, 메모, 읽기 시작한 날과 완독한 날, 공개 여부',
            '연간 독서 목표',
            '팔로우, 좋아요, 댓글',
          ]}
        />
        <p className='mt-4 font-medium text-text-strong'>자동으로 쌓이는 것</p>
        <DocList
          items={[
            '로그인 상태를 유지하기 위한 인증 쿠키',
            '어떤 화면이 많이 쓰이는지에 대한 익명 통계 (Google Analytics)',
          ]}
        />
        <p className='mt-4 text-sm text-text-subtle'>
          주민등록번호, 결제 정보, 위치 정보는 받지 않습니다.
        </p>
      </DocSection>

      <DocSection title='2. 정보를 쓰는 목적'>
        <DocList
          items={[
            '로그인과 본인 확인',
            '독서 기록을 저장하고 책장·통계로 보여 주기',
            'AI 독서 취향 분석과 독서 궁합 분석',
            '팔로우한 사람의 활동 알림',
            '공개로 설정한 책장을 다른 사람에게 보여 주기',
            '서비스 개선 (어떤 기능이 쓰이는지 익명 통계로 확인)',
          ]}
        />
      </DocSection>

      <DocSection title='3. 외부 서비스에 맡기는 처리'>
        <p>
          page0127은 아래 서비스의 힘을 빌려 동작합니다. 각 서비스에는 그 일에
          필요한 만큼의 정보만 전달됩니다.
        </p>
        <div className='mt-3 overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-line text-left text-text-subtle'>
                <th className='py-2 pr-4 font-medium'>서비스</th>
                <th className='py-2 pr-4 font-medium'>맡기는 일</th>
                <th className='py-2 font-medium'>전달되는 정보</th>
              </tr>
            </thead>
            <tbody className='text-text-body'>
              <tr className='border-b border-line-soft'>
                <td className='py-2.5 pr-4'>Supabase</td>
                <td className='py-2.5 pr-4'>
                  로그인, 데이터 저장, 이미지 보관
                </td>
                <td className='py-2.5'>계정 정보, 독서 기록 전체</td>
              </tr>
              <tr className='border-b border-line-soft'>
                <td className='py-2.5 pr-4'>Vercel</td>
                <td className='py-2.5 pr-4'>서비스 호스팅</td>
                <td className='py-2.5'>접속 기록</td>
              </tr>
              <tr className='border-b border-line-soft'>
                <td className='py-2.5 pr-4'>OpenAI</td>
                <td className='py-2.5 pr-4'>독서 취향·궁합 분석</td>
                <td className='py-2.5'>
                  완독한 책의 제목·저자·별점 (이름·이메일은 보내지 않습니다)
                </td>
              </tr>
              <tr className='border-b border-line-soft'>
                <td className='py-2.5 pr-4'>알라딘</td>
                <td className='py-2.5 pr-4'>책 정보 검색</td>
                <td className='py-2.5'>검색어 (개인정보 아님)</td>
              </tr>
              <tr>
                <td className='py-2.5 pr-4'>Google Analytics</td>
                <td className='py-2.5 pr-4'>익명 사용 통계</td>
                <td className='py-2.5'>페이지 조회 기록 (익명)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className='mt-3 text-sm text-text-subtle'>
          이 목적 외에 개인정보를 다른 곳에 팔거나 넘기지 않습니다.
        </p>
      </DocSection>

      <DocSection title='4. 얼마나 보관하나요'>
        <p>
          계정을 유지하는 동안 보관하고, <strong>탈퇴하면 즉시 삭제</strong>
          합니다. 독서 기록, 메모, 별점, 팔로우 관계, 댓글, 분석 결과가 모두
          지워지며 복구할 수 없습니다.
        </p>
        <p className='text-sm text-text-subtle'>
          다만 다른 사람의 화면에 이미 남은 활동(예: 내가 단 댓글에 달린 답글)의
          맥락은 탈퇴한 사용자로 표시될 수 있습니다.
        </p>
      </DocSection>

      <DocSection title='5. 공개되는 정보'>
        <p>
          책을 등록할 때 <strong>공개</strong>로 설정하면, 그 책은 공개 서재
          주소(<code className='text-sm'>/사용자명</code>)를 아는 사람 누구나 볼
          수 있습니다. 닉네임과 프로필 사진도 함께 보입니다.
        </p>
        <p>
          비공개로 둔 책과 메모는 다른 사람에게 보이지 않습니다. 언제든 설정에서
          바꿀 수 있어요.
        </p>
      </DocSection>

      <DocSection title='6. 이용자의 권리'>
        <DocList
          items={[
            '내가 남긴 기록은 언제든 열람하고 수정할 수 있습니다.',
            '책 하나하나의 공개 여부를 직접 정할 수 있습니다.',
            '설정 화면에서 계정을 삭제하면 모든 데이터가 지워집니다.',
          ]}
        />
      </DocSection>

      <DocSection title='7. 쿠키'>
        <p>
          로그인 상태를 유지하기 위해 인증 쿠키를 씁니다. 브라우저에서 쿠키를
          지우면 로그아웃됩니다. 광고 목적의 추적 쿠키는 쓰지 않습니다.
        </p>
      </DocSection>

      <DocSection title='8. 개인정보 문의'>
        <p>
          개인정보 처리에 관한 문의나 요청(열람·수정·삭제 등)은{' '}
          <Link href='/contact' className='underline'>
            문의 페이지
          </Link>
          의 카카오톡 창구로 연락 주세요.
        </p>
      </DocSection>
    </DocPage>
  );
};

export default PrivacyPage;
