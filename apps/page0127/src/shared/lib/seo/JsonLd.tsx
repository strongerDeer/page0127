import { serializeJsonLd } from './structuredData';

type JsonLdProps = {
  data: unknown;
};

/**
 * JSON-LD <script> 태그 (Server Component)
 *
 * 학습 포인트:
 * - next/script가 아니라 일반 <script>를 쓴다. JSON-LD는 실행되는 코드가 아니라
 *   데이터라서, 로딩 전략이 필요 없고 초기 HTML에 그대로 있어야 크롤러가 읽는다.
 */
export const JsonLd = ({ data }: JsonLdProps) => (
  <script
    type='application/ld+json'
    dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
  />
);
