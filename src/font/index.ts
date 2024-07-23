import localFont from 'next/font/local';
import { Cormorant_Garamond } from 'next/font/google';

export const pretendard = localFont({
  src: '../font/PretendardVariable.woff2',
  display: 'swap',
  weight: '100 900',
});

export const cormorant = Cormorant_Garamond({
  weight: '300', // 300 ~ 700
  style: 'italic',
  display: 'swap',
  subsets: ['latin'],
});
