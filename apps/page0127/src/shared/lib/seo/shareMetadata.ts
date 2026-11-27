import type { Metadata } from 'next';

type ShareMetadataInput = {
  /** 이 페이지 주소(metadataBase 기준 상대 경로) — 예: '/sentence' */
  path: string;
  /** 링크 미리보기 제목 */
  title: string;
  /** 링크 미리보기 설명 */
  description: string;
};

/**
 * 링크 미리보기(openGraph·twitter) 메타데이터 — 페이지 metadata 에 펼쳐 넣는다.
 *
 * 왜 페이지마다 적어야 하나: 루트 layout 의 openGraph 는 자기 값을 안 적은 페이지에
 * **그대로** 물려진다. 그래서 /about·/sentence 같은 페이지도 카톡 미리보기 제목이
 * 홈 문구였다(2026-11-27 공유 점검). 페이지가 title 만 바꾸면 <title> 만 바뀌고
 * og:title 은 홈 그대로다.
 *
 * 왜 siteName·locale 까지 다시 적나: Next 는 openGraph 객체를 깊게 합치지 않고
 * **통째로 갈아 끼운다**. 페이지가 openGraph 를 적는 순간 루트의 siteName·locale 이 빠진다.
 *
 * ⚠️ 같은 이유로 루트 opengraph-image 그림도 지워진다 — openGraph 를 적는 페이지는
 * 같은 폴더에 opengraph-image.tsx 를 함께 둔다(파일 규칙 그림은 지워지지 않는다).
 */
export const buildShareMetadata = ({
  path,
  title,
  description,
}: ShareMetadataInput): Pick<Metadata, 'openGraph' | 'twitter'> => ({
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'page0127.',
    url: path,
    title,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
});
