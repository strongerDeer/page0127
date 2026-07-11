import { ComingSoon } from '@/widgets/landing/ui/ComingSoon';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '소개 - page0127',
};

const AboutPage = () => {
  return (
    <ComingSoon
      title='소개'
      description='page0127이 어떤 서비스인지 곧 자세히 소개해 드릴게요.'
    />
  );
};

export default AboutPage;
