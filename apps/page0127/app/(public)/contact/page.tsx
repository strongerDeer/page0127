import { ComingSoon } from '@/widgets/landing/ui/ComingSoon';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '문의 - page0127',
};

const ContactPage = () => {
  return (
    <ComingSoon
      title='문의'
      description='문의 창구를 준비하고 있어요. 곧 안내해 드릴게요.'
    />
  );
};

export default ContactPage;
