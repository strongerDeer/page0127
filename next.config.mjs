// const { createVanillaExtractPlugin } = require('@vanilla-extract/next-plugin');

import { createVanillaExtractPlugin } from '@vanilla-extract/next-plugin';
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/ttb/api/:path*',
        destination: 'http://www.aladin.co.kr/ttb/api/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.aladin.co.kr' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

const withVanillaExtract = createVanillaExtractPlugin();
export default withVanillaExtract(nextConfig);
