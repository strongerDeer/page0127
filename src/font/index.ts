import localFont from 'next/font/local';
import { Cormorant_Garamond } from 'next/font/google';

export const pretendard = localFont({
  src: './PretendardVariable.woff2',
  display: 'swap',
  preload: true,
  weight: '100 900',
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    'Roboto',
    'Helvetica Neue',
    'Segoe UI',
    'Arial',
    'sans-serif',
  ],
  adjustFontFallback: 'Arial',
  variable: '--font-pretendard',
});

export const cormorant = Cormorant_Garamond({
  weight: '300', // 300 ~ 700
  style: 'italic',
  display: 'swap',
  subsets: ['latin'],
  preload: true,
});
