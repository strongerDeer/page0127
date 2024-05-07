/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/page0127',
  assetPrefix:
    process.env.NODE_ENV === 'production'
      ? 'https://strongerdeer.github.io/page0127'
      : '',
  async rewrites() {
    return [
      {
        source: '/ttb/api/:path*',
        destination: 'http://www.aladin.co.kr/ttb/api/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'image.aladin.co.kr' }],
  },
};

export default nextConfig;
