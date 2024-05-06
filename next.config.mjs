/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: 'http://www.aladin.co.kr/ttb/api/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'image.aladin.co.kr' }],
  },
};

export default nextConfig;
