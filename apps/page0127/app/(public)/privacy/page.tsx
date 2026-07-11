import { ComingSoon } from '@/widgets/landing/ui/ComingSoon';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 - page0127',
};

const PrivacyPage = () => {
  return (
    <ComingSoon
      title='개인정보처리방침'
      description='개인정보처리방침을 준비하고 있어요. 곧 공개할게요.'
    />
  );
};

export default PrivacyPage;
