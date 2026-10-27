import Link from 'next/link';

import { SITE_INFO } from '@/widgets/landing/model/siteInfo';
import { DocList, DocPage, DocSection } from '@/widgets/landing/ui/DocPage';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 | page0127.',
  description:
    'page0127.이 수집하는 개인정보와 처리 방식, 이용자의 권리를 안내합니다.',
};

/** 국외 이전 표의 문의처 — 각 회사 개인정보처리방침에 문의 방법이 있다 */
const ExternalLink = ({ href }: { href: string }) => (
  <a
    href={href}
    target='_blank'
    rel='noopener noreferrer'
    className='whitespace-nowrap underline'
  >
    개인정보처리방침
  </a>
);

/**
 * 개인정보처리방침
 *
 * 코드에서 실제로 확인한 처리 내역만 적는다. 지어내지 않는다.
 * - 인증: Supabase Auth + Google·Kakao OAuth
 *   (카카오 동의항목은 닉네임·프로필 사진·이메일 모두 "필수 동의" —
 *    2026-10-01 카카오 콘솔에서 확인. 콘솔 설정을 바꾸면 이 문서도 고칠 것.
 *    코드는 email 이 null 인 경우도 견디게 되어 있다:
 *    app/auth/callback/route.ts, entities/profile/model/identityDefaults.ts)
 * - 저장: Supabase(Postgres, Storage)
 * - 호스팅: Vercel
 * - AI 분석: OpenAI
 * - 도서 정보: YES24 Open API
 * - 사용 통계: Google Analytics 4 (NEXT_PUBLIC_GA_ID 설정 시)
 * - 성능 측정: 자체 RUM(quality_rum_samples) + Vercel Speed Insights
 * - 오류 모니터링: Sentry (us 리전, userInfo 수집 끔)
 * - 댓글 신고: comment_reports (신고자·사유·상세)
 * - 접속 기록: user_daily_visits (일별, 사용자별)
 * - 책 추천·같이 읽기 초대: reading_envelopes (알림과 함께 지워진다 — 읽은 알림 30일)
 * - AI 사용 횟수: ai_usage_logs (사용자·기능·시각, 사용량 제한용)
 * - 레이트 리밋: rate_limits (비로그인은 ip:<IP>, 1시간 지난 행은 매일 크론이 지운다)
 * - 개인정보 문의: 카카오톡 1:1 오픈채팅(/contact)
 */
const PrivacyPage = () => {
  return (
    <DocPage
      title='개인정보처리방침'
      description='page0127.이 어떤 정보를 왜 처리하고, 어떻게 보호하는지 안내합니다.'
      showUpdatedAt
    >
      <DocSection title='1. 수집하는 정보'>
        <p className='font-medium text-text-strong'>
          소셜 계정으로 로그인할 때
        </p>
        <DocList
          items={[
            '구글 — 이메일 주소, 이름, 프로필 사진',
            '카카오 — 닉네임, 프로필 사진, 이메일 주소',
          ]}
        />
        <p className='mt-3 text-sm text-text-subtle'>
          설정에서 구글과 카카오 계정을 한 계정에 연결하면, 연결한 두 곳의
          정보를 모두 받습니다. 연결을 끊으면 그 계정으로는 더 이상 로그인할 수
          없습니다.
        </p>
        <p className='mt-4 font-medium text-text-strong'>
          서비스를 쓰면서 직접 남기는 것
        </p>
        <DocList
          items={[
            '닉네임, 사용자명(공개 서재 주소에 쓰입니다), 프로필 사진',
            '읽은 책의 기록 — 책 정보, 별점, 메모, 읽기 시작한 날과 완독한 날, 공개 여부',
            '연간 독서 목표',
            '팔로우, 좋아요, 댓글',
            '책 추천이나 같이 읽기 초대를 보낼 때 — 받는 사람, 고른 책, 받은 사람이 수락하거나 담았는지',
            '댓글을 신고할 때 — 신고한 댓글, 신고 사유와 설명',
          ]}
        />
        <p className='mt-4 font-medium text-text-strong'>자동으로 쌓이는 것</p>
        <DocList
          items={[
            '로그인 상태를 유지하기 위한 인증 쿠키',
            '어떤 화면이 많이 쓰이는지에 대한 이용 통계 (Google Analytics, Vercel Analytics)',
            '서비스에 접속한 날짜와 그날 첫 접속 시각',
            'AI 분석을 쓴 기록 — 언제 어떤 분석을 했는지 (한 사람이 쓸 수 있는 횟수를 제한하기 위해)',
            '로그인하지 않은 상태의 IP 주소 — 짧은 시간에 요청이 몰리는 것을 막기 위해 잠깐 쓰고, 하루 안에 지웁니다',
            '화면이 뜨는 속도 같은 성능 측정값 (페이지 주소, 모바일·데스크톱 구분, 브라우저 종류)',
            '오류가 났을 때의 오류 내용, 발생한 페이지 주소, 브라우저 정보',
            '알림을 켠 경우 — 이 기기로 알림을 보내기 위한 푸시 구독 정보(구독 주소·암호화 키)와 브라우저 종류',
          ]}
        />
        <p className='mt-4 text-sm text-text-subtle'>
          주민등록번호, 결제 정보, 위치 정보는 받지 않습니다. 만 14세 미만은
          가입할 수 없어 아동의 개인정보는 받지 않으며, 만 14세 미만으로
          확인되면 계정과 기록을 바로 삭제합니다.
        </p>
      </DocSection>

      <DocSection title='2. 정보를 쓰는 목적'>
        <DocList
          items={[
            '로그인과 본인 확인',
            '독서 기록을 저장하고 책장·통계로 보여 주기',
            'AI 독서 취향 분석과 독서 케미 분석',
            '알림 보내기 — 팔로우·좋아요·댓글, 오래 읽고 있는 책, 주간 회상 (알림을 켜면 기기 푸시로도)',
            '공개로 설정한 책장을 다른 사람에게 보여 주기',
            '신고된 댓글을 확인하고 조치하기',
            '서비스 개선 (어떤 기능이 쓰이는지 이용 통계로 확인)',
            '오류를 찾아 고치고, 느린 화면을 개선하기',
            '과도한 요청과 AI 사용량을 제한해 서비스를 안정적으로 운영하기',
          ]}
        />
      </DocSection>

      <DocSection title='3. 외부 서비스에 맡기는 처리'>
        <p>
          page0127.은 아래 서비스의 힘을 빌려 동작합니다. 각 서비스에는 그 일에
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
                <td className='py-2.5 pr-4'>독서 취향·케미 분석</td>
                <td className='py-2.5'>
                  완독한 책의 제목·저자·분류·책 소개·목차와 별점
                  (이름·닉네임·이메일·메모는 보내지 않습니다)
                </td>
              </tr>
              <tr className='border-b border-line-soft'>
                <td className='py-2.5 pr-4'>YES24</td>
                <td className='py-2.5 pr-4'>책 정보 검색</td>
                <td className='py-2.5'>검색어 (개인정보 아님)</td>
              </tr>
              <tr className='border-b border-line-soft'>
                <td className='py-2.5 pr-4'>Google Analytics</td>
                <td className='py-2.5 pr-4'>서비스 이용 통계</td>
                <td className='py-2.5'>페이지 조회 및 기기·브라우저 정보</td>
              </tr>
              <tr className='border-b border-line-soft'>
                <td className='py-2.5 pr-4'>
                  Vercel Analytics · Speed Insights
                </td>
                <td className='py-2.5 pr-4'>사용 현황·성능 측정</td>
                <td className='py-2.5'>
                  페이지 조회, 기기·브라우저 및 성능 정보
                </td>
              </tr>
              <tr className='border-b border-line-soft'>
                <td className='py-2.5 pr-4'>
                  브라우저 푸시 서비스 (Google·Apple·Mozilla 등, 쓰는 브라우저에
                  따라)
                </td>
                <td className='py-2.5 pr-4'>
                  푸시 알림 전달 (알림을 켠 경우만)
                </td>
                <td className='py-2.5'>
                  푸시 구독 주소, 알림 문구 (내용은 암호화되어 전달됩니다)
                </td>
              </tr>
              <tr>
                <td className='py-2.5 pr-4'>Sentry</td>
                <td className='py-2.5 pr-4'>오류 감지</td>
                <td className='py-2.5'>
                  오류 내용, 발생한 페이지 주소, 브라우저 정보 (이름·이메일은
                  보내지 않습니다)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className='mt-3 text-sm text-text-subtle'>
          이 목적 외에 개인정보를 다른 곳에 팔거나 넘기지 않습니다.
        </p>
      </DocSection>

      {/* 개인정보보호법 제28조의8 — 국외 이전 시 국가·항목·시기·방법·보유기간·거부 방법 고지 */}
      <DocSection title='4. 국외로 옮겨지는 정보'>
        <p>
          계정 정보와 독서 기록은 국내(서울) 데이터센터에 저장됩니다. 다만 아래
          서비스는 미국에 있는 회사가 처리하므로, 해당 정보가 미국으로
          옮겨집니다.
        </p>
        <div className='mt-3 overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-line text-left text-text-subtle'>
                <th className='py-2 pr-4 font-medium'>받는 곳 (국가)</th>
                <th className='py-2 pr-4 font-medium'>옮겨지는 정보</th>
                <th className='py-2 pr-4 font-medium'>목적</th>
                <th className='py-2 font-medium'>개인정보 문의</th>
              </tr>
            </thead>
            <tbody className='text-text-body'>
              <tr className='border-b border-line-soft'>
                <td className='py-2.5 pr-4'>OpenAI (미국)</td>
                <td className='py-2.5 pr-4'>완독한 책의 정보와 별점</td>
                <td className='py-2.5 pr-4'>독서 취향·케미 분석</td>
                <td className='py-2.5'>
                  <ExternalLink href='https://openai.com/policies/privacy-policy' />
                </td>
              </tr>
              <tr className='border-b border-line-soft'>
                <td className='py-2.5 pr-4'>Vercel (미국)</td>
                <td className='py-2.5 pr-4'>
                  접속 기록, 페이지 조회·성능 정보
                </td>
                <td className='py-2.5 pr-4'>호스팅, 이용 통계·성능 측정</td>
                <td className='py-2.5'>
                  <ExternalLink href='https://vercel.com/legal/privacy-policy' />
                </td>
              </tr>
              <tr className='border-b border-line-soft'>
                <td className='py-2.5 pr-4'>Google (미국)</td>
                <td className='py-2.5 pr-4'>페이지 조회, 기기·브라우저 정보</td>
                <td className='py-2.5 pr-4'>이용 통계</td>
                <td className='py-2.5'>
                  <ExternalLink href='https://policies.google.com/privacy' />
                </td>
              </tr>
              <tr className='border-b border-line-soft'>
                <td className='py-2.5 pr-4'>브라우저 푸시 서비스 (미국 등)</td>
                <td className='py-2.5 pr-4'>
                  푸시 구독 주소, 암호화된 알림 문구
                </td>
                <td className='py-2.5 pr-4'>
                  푸시 알림 전달 (알림을 켠 경우만)
                </td>
                <td className='py-2.5'>
                  쓰는 브라우저 회사의 개인정보처리방침
                </td>
              </tr>
              <tr>
                <td className='py-2.5 pr-4'>Sentry (미국)</td>
                <td className='py-2.5 pr-4'>
                  오류 내용, 페이지 주소, 브라우저 정보
                </td>
                <td className='py-2.5 pr-4'>오류 감지</td>
                <td className='py-2.5'>
                  <ExternalLink href='https://sentry.io/privacy/' />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <DocList
          items={[
            '언제, 어떻게 — 서비스를 이용할 때마다 암호화된 인터넷 통신으로 전송됩니다.',
            '얼마나 보관 — 각 회사의 보관 정책에 따른 기간 동안 보관된 뒤 삭제됩니다. OpenAI는 API로 받은 내용을 학습에 쓰지 않고, 남용 감시를 위해 최대 30일 보관한 뒤 지웁니다.',
            '거부하려면 — AI 분석을 쓰지 않으면 OpenAI로는, 알림을 끄면 푸시 서비스로는 아무것도 전송되지 않습니다. 나머지는 서비스 운영에 꼭 필요한 처리라 거부하려면 서비스 이용을 멈추고 탈퇴해야 합니다. 브라우저 설정으로 통계 쿠키는 막을 수 있습니다.',
          ]}
        />
      </DocSection>

      <DocSection title='5. 얼마나 보관하나요'>
        <p>
          계정을 유지하는 동안 보관하고, <strong>탈퇴하면 즉시 삭제</strong>
          합니다. 계정 정보, 독서 기록, 메모, 별점, 팔로우 관계와 분석 결과는
          지워지며 복구할 수 없습니다.
        </p>
        <p className='text-sm text-text-subtle'>
          다만 다른 사람의 글에 남긴 댓글은 대화 맥락을 위해 작성자 식별정보를
          제거한 뒤 &quot;탈퇴한 사용자&quot;의 댓글로 보존될 수 있습니다. 접속
          기록과 분석 정보는 각 외부 처리 서비스의 보관 설정 및 관계 법령에 따른
          기간 동안 보관될 수 있습니다.
        </p>
        <DocList
          items={[
            '읽은 알림(책 추천·같이 읽기 초대 포함) — 읽고 30일이 지나면 삭제',
            '로그인하지 않은 상태의 IP 주소 — 하루 안에 삭제',
          ]}
        />
      </DocSection>

      <DocSection title='6. 공개되는 정보'>
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

      <DocSection title='7. 이용자의 권리'>
        <DocList
          items={[
            '내가 남긴 기록은 언제든 열람하고 수정할 수 있습니다.',
            '책 하나하나의 공개 여부를 직접 정할 수 있습니다.',
            '개인정보 처리를 멈춰 달라고 요구하거나, 동의를 거두어들일 수 있습니다. 문의 창구로 요청하면 지체 없이 처리합니다.',
            '설정 화면에서 계정을 삭제할 수 있습니다. 다른 사람의 글에 남긴 댓글은 작성자 식별정보가 제거된 상태로 남을 수 있습니다.',
          ]}
        />
      </DocSection>

      <DocSection title='8. 쿠키'>
        <p>
          로그인 상태를 유지하기 위해 인증 쿠키를 씁니다. 브라우저에서 쿠키를
          지우면 로그아웃됩니다. Google Analytics가 설정된 경우 서비스 이용
          통계를 위한 쿠키 또는 유사 기술이 사용될 수 있으며, 브라우저 설정에서
          쿠키를 차단하거나 삭제할 수 있습니다. 광고를 노출하기 위한 쿠키는 쓰지
          않습니다.
        </p>
      </DocSection>

      <DocSection title='9. 파기 방법'>
        <p>
          보유 목적이 끝난 개인정보는 데이터베이스에서 삭제하고, 프로필 이미지는
          저장소에서 삭제합니다. 전자 파일은 복구하기 어렵도록 삭제하며, 법령상
          보존 의무가 있는 정보는 다른 정보와 분리해 해당 기간 동안만
          보관합니다.
        </p>
      </DocSection>

      {/* 개인정보보호법 제30조 제1항 — 안전성 확보 조치는 처리방침 필수 기재 사항 */}
      <DocSection title='10. 개인정보를 지키기 위한 조치'>
        <DocList
          items={[
            '모든 통신은 HTTPS로 암호화합니다.',
            '데이터베이스는 행 단위 접근 제어를 걸어, 로그인한 사람이 자기 기록만 읽고 고칠 수 있게 합니다. 비공개로 둔 책과 메모는 다른 사람이 조회할 수 없습니다.',
            '관리 기능은 운영자 계정만 쓸 수 있고, 관리자 권한이 필요한 키는 서버에만 두며 화면(브라우저)으로 보내지 않습니다.',
            '오류 모니터링에는 이름·이메일 같은 사용자 정보를 보내지 않습니다.',
            '인증은 비밀번호를 직접 받지 않고 구글·카카오 로그인으로만 합니다.',
          ]}
        />
      </DocSection>

      <DocSection title='11. 개인정보 보호책임자 및 문의'>
        {(SITE_INFO.privacyOfficer.name || SITE_INFO.privacyOfficer.email) && (
          <DocList
            items={[
              ...(SITE_INFO.privacyOfficer.name
                ? [
                    `개인정보 보호책임자 — ${SITE_INFO.privacyOfficer.name} (page0127. 운영자)`,
                  ]
                : []),
              ...(SITE_INFO.privacyOfficer.email
                ? [`이메일 — ${SITE_INFO.privacyOfficer.email}`]
                : []),
            ]}
          />
        )}
        <p>
          개인정보 보호업무 담당은 page0127. 운영자입니다. 개인정보 처리에 관한
          문의나 요청(열람·수정·삭제 등)은{' '}
          <Link href='/contact' className='underline'>
            문의 페이지
          </Link>
          의 카카오톡 창구로 연락 주세요.
        </p>
      </DocSection>

      <DocSection title='12. 권익 침해 구제 방법'>
        <p>
          개인정보 침해에 대한 신고나 상담이 필요하면 아래 기관에 문의할 수
          있습니다.
        </p>
        <DocList
          items={[
            '개인정보분쟁조정위원회 — 1833-6972 (www.kopico.go.kr)',
            '개인정보침해신고센터 — 118 (privacy.kisa.or.kr)',
            '대검찰청 — 1301 (www.spo.go.kr)',
            '경찰청 — 182 (ecrm.police.go.kr)',
          ]}
        />
      </DocSection>

      <DocSection title='13. 처리방침이 바뀌면'>
        <p>
          이 방침은 {SITE_INFO.lastUpdated}부터 적용됩니다. 내용이 바뀌면 이
          페이지를 고치고 최종 수정일을 갱신합니다. 수집하는 정보나 맡기는 곳이
          늘어나는 것처럼 중요한 변경은 적용 7일 전부터 서비스 안에서 알려
          드립니다.
        </p>
      </DocSection>
    </DocPage>
  );
};

export default PrivacyPage;
