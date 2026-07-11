import { ComingSoon } from '@/widgets/landing/ui/ComingSoon';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관 - page0127',
};

const TermsPage = () => {
  return (
    <ComingSoon
      title='이용약관'
      description='이용약관을 준비하고 있어요. 곧 공개할게요.'
    />
  );
};

export default TermsPage;
