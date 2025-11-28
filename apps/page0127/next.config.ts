import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 모노레포 패키지의 CSS/JS 파일을 트랜스파일하도록 설정
  transpilePackages: ["@repo/design-tokens"],
};

export default nextConfig;
