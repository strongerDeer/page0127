import { CHANGELOG, SITE_INFO } from '@/widgets/landing/model/siteInfo';
import { DocPage, DocSection } from '@/widgets/landing/ui/DocPage';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '소개 | page0127',
  description:
    '읽은 책을 기록하면 책장이 쌓이고, 그 책장이 독서 취향을 말해 줍니다. page0127을 소개합니다.',
};

const AboutPage = () => {
  return (
    <DocPage title='page0127 소개' description='읽은 책이 모여 책장이 됩니다.'>
      <DocSection title='왜 만들었나요'>
        <p>
          책을 다 읽고 나면 기억은 흐려지는데, 기록은 여기저기 흩어져 있었어요.
          메모 앱에, SNS에, 사진첩에. 한곳에 모아 두면 무엇이 보일까
          궁금했습니다.
        </p>
        <p>
          그래서 만들었습니다. 읽은 책을 한 권씩 쌓아 두면 그 책장이 무엇을 말해
          주는지 보고 싶었어요. 책장을 보면 그 사람이 보이니까요.
        </p>
      </DocSection>

      <DocSection title='무엇을 할 수 있나요'>
        <p>
          읽은 책을 기록하고 별점과 메모를 남깁니다. 완독한 책이 다섯 권쯤
          모이면 독서 성향을 읽어 드리고, 다음에 읽을 책까지 골라 드려요.
        </p>
        <p>
          책장은 주소 하나로 공개할 수 있습니다. 다른 사람의 책장과 나란히 놓아
          독서 궁합을 보고, 서로의 책장에서 건넬 책을 골라 볼 수도 있어요.
        </p>
      </DocSection>

      <DocSection title='누가 만들었나요'>
        <p>
          한 사람이 만들고 있는 개인 프로젝트입니다. {SITE_INFO.since}에
          시작했어요.
        </p>
        <p className='text-sm text-text-subtle'>
          혼자 만들다 보니 느리고, 가끔 고장도 납니다. AI가 읽어 주는 독서 성향도
          늘 맞지는 않아요. 그래도 한 권씩 쌓다 보면 꽤 그럴듯한 이야기가
          나옵니다.
        </p>
      </DocSection>

      <DocSection title='무엇이 바뀌었나요'>
        <ol className='space-y-6'>
          {CHANGELOG.map((entry) => (
            <li key={entry.date} className='flex gap-4'>
              <time className='w-20 shrink-0 pt-0.5 text-sm tabular-nums text-text-faint'>
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
    </DocPage>
  );
};

export default AboutPage;
