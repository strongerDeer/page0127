import Link from 'next/link';

import { DocList, DocPage, DocSection } from '@/widgets/landing/ui/DocPage';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관 | page0127',
  description: 'page0127을 이용할 때의 약속을 안내합니다.',
};

const TermsPage = () => {
  return (
    <DocPage
      title='이용약관'
      description='page0127을 쓰기 전에 알아 두셨으면 하는 것들입니다.'
      showUpdatedAt
    >
      <DocSection title='1. 어떤 서비스인가요'>
        <p>
          page0127은 읽은 책을 기록하고, 쌓인 책장에서 독서 취향을 발견하는
          서비스입니다. 한 사람이 만들고 운영하는 개인 프로젝트예요.
        </p>
      </DocSection>

      <DocSection title='2. 계정'>
        <DocList
          items={[
            '구글 계정으로 가입합니다. 계정 관리는 본인 책임입니다.',
            '사용자명은 공개 서재 주소가 되므로 다른 사람과 겹칠 수 없습니다.',
            '언제든 설정에서 탈퇴할 수 있고, 탈퇴하면 기록은 모두 지워집니다.',
          ]}
        />
      </DocSection>

      <DocSection title='3. 내가 올린 기록은 내 것입니다'>
        <p>
          독서 기록, 별점, 메모의 권리는 작성한 사람에게 있습니다. page0127은
          서비스를 보여 주기 위해 필요한 범위(책장 표시, 공개 설정한 기록의 노출,
          통계 집계)에서만 이 기록을 사용합니다.
        </p>
        <p>
          공개로 설정한 기록은 다른 사람이 볼 수 있습니다. 무엇을 공개할지는
          직접 정하세요.
        </p>
      </DocSection>

      <DocSection title='4. 하지 말아 주세요'>
        <DocList
          items={[
            '다른 사람을 괴롭히거나 모욕하는 내용을 올리는 것',
            '타인의 저작물을 무단으로 복제해 올리는 것 (책 본문 전재 등)',
            '자동화된 방법으로 서비스에 과도한 부하를 주는 것',
            '다른 사람의 계정을 도용하거나 사칭하는 것',
          ]}
        />
        <p className='text-sm text-text-subtle'>
          이런 기록은 예고 없이 삭제될 수 있고, 반복되면 계정 이용이 제한될 수
          있습니다.
        </p>
      </DocSection>

      <DocSection title='5. AI 분석에 대하여'>
        <p>
          독서 취향과 궁합은 AI가 읽어 주는 <strong>해석</strong>이지 사실이
          아닙니다. 틀릴 수 있어요. 추천하는 책도 마찬가지고, 실제로 존재하지
          않는 책을 추천하는 일이 드물게 생길 수 있습니다.
        </p>
        <p className='text-sm text-text-subtle'>
          분석을 위해 완독한 책의 제목·저자·별점이 OpenAI로 전달됩니다. 이름이나
          이메일은 보내지 않습니다. 자세한 내용은{' '}
          <Link
            href='/privacy'
            className='underline underline-offset-2 hover:text-text-strong'
          >
            개인정보처리방침
          </Link>
          을 봐 주세요.
        </p>
      </DocSection>

      <DocSection title='6. 서비스는 완벽하지 않습니다'>
        <p>
          개인이 만드는 서비스라 예고 없이 고장 나거나, 점검으로 잠시 멈추거나,
          기능이 바뀔 수 있습니다. 중요한 기록은 따로 백업해 두시길 권합니다.
        </p>
        <p>
          데이터 손실이나 서비스 중단으로 생긴 손해에 대해 page0127은 법이 정한
          범위를 넘는 책임을 지지 않습니다.
        </p>
      </DocSection>

      <DocSection title='7. 약관이 바뀌면'>
        <p>
          약관이 바뀌면 이 페이지를 고치고 최종 수정일을 갱신합니다. 중요한
          변경은 서비스 안에서 따로 알려 드릴게요.
        </p>
      </DocSection>
    </DocPage>
  );
};

export default TermsPage;
