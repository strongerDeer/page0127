import { AboutHero, Manifesto, StepsShowcase } from '@/widgets/about';
import { getRecentBooks } from '@/widgets/about/api/getRecentBooks';
import { CHANGELOG, SITE_INFO } from '@/widgets/landing/model/siteInfo';
import { DocSection } from '@/widgets/landing/ui/DocPage';
import { TasteExampleCard } from '@/widgets/landing/ui/TasteExampleCard';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '소개 | page0127',
  description:
    '읽은 책을 기록하면 책장이 쌓이고, 그 책장이 독서 취향을 말해 줍니다. page0127을 소개합니다.',
};

// 표지·통계는 한 시간에 한 번만 새로 만든다 — 매 요청 조회할 내용이 아니다
export const revalidate = 3600;

const AboutPage = async () => {
  const books = await getRecentBooks();

  return (
    // break-keep: 한국어를 단어 단위로 줄바꿈한다 — 없으면 '쌓/인'처럼 단어 중간에서 끊긴다
    <div className='break-keep'>
      <AboutHero books={books} />
      <Manifesto />
      <StepsShowcase books={books} tasteSlot={<TasteExampleCard />} />
      {/* 아래 섹션들은 다음 단계에서 하나씩 새 섹션으로 바뀐다.
          h1 은 히어로가 가지므로 DocPage(자체 h1) 대신 감싸기만 한다 */}
      <div className='mx-auto max-w-3xl space-y-10 px-4 py-16'>
        <DocSection title='누가 만들었나요'>
          <p>
            한 사람이 만들고 있는 개인 프로젝트입니다. {SITE_INFO.since}에
            시작했어요.
          </p>
          <p className='text-sm text-text-subtle'>
            혼자 만들다 보니 느리고, 가끔 고장도 납니다. AI가 읽어 주는 독서
            성향도 늘 맞지는 않아요. 그래도 한 권씩 쌓다 보면 꽤 그럴듯한
            이야기가 나옵니다.
          </p>
        </DocSection>

        <DocSection title='무엇이 바뀌었나요'>
          <ol className='space-y-6'>
            {CHANGELOG.map((entry) => (
              <li key={entry.date} className='flex gap-4'>
                <time className='w-20 shrink-0 pt-0.5 text-sm tabular-nums text-text-subtle'>
                  {entry.date}
                </time>
                <div className='flex-1 border-l border-line pb-1 pl-4'>
                  <p className='font-medium text-text-strong'>{entry.title}</p>
                  {entry.description && (
                    <p className='mt-1 text-sm text-text-subtle'>
                      {entry.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </DocSection>
      </div>
    </div>
  );
};

export default AboutPage;
