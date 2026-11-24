import { useId } from 'react';

import { Sparkles } from 'lucide-react';

import styles from './LibraryFeatureBanner.module.css';

/**
 * 서재 상단 배너 — 방문자에겐 독서 케미, 주인에겐 AI 취향 분석.
 *
 * 예전엔 두 기능이 버튼 줄의 작은 버튼(케미는 테두리 버튼)이라 눈에 띄지 않았고,
 * 비로그인 방문자에겐 아래에 "독서 케미는?" 카드가 한 번 더 나왔다.
 * 2026-11-24 HJ: 상단이 허전하고 버튼이 약하다 → 배너 한 장으로 모은다(아래 카드 흡수).
 *
 * 무엇을 누를지는 부모가 정한다(actions) — 케미는 링크, 분석은 확인 창을 여는 버튼이라 동작이 다르다.
 */
type LibraryFeatureBannerProps = {
  kind: 'chemistry' | 'taste';
  title: React.ReactNode;
  description: React.ReactNode;
  actions: React.ReactNode;
};

const LABEL = {
  chemistry: '독서 케미',
  taste: 'AI 취향 분석',
} as const;

export const LibraryFeatureBanner = ({
  kind,
  title,
  description,
  actions,
}: LibraryFeatureBannerProps) => (
  <section
    aria-label={LABEL[kind]}
    data-feature-banner={kind}
    className={styles.card}
  >
    <div className={styles.text}>
      <div>
        <span className={styles.chip}>
          <Sparkles aria-hidden className='size-3.5' />
          {LABEL[kind]}
        </span>
        <h2 className={styles.title}>{title}</h2>
      </div>
      <p className={styles.sub}>{description}</p>
      <div className={styles.actions}>{actions}</div>
    </div>
    <div aria-hidden className={styles.art}>
      <BooksArt
        badge={kind === 'chemistry' ? '?%' : 'AI'}
        three={kind === 'taste'}
      />
    </div>
  </section>
);

/**
 * 기울어진 책 두 권(분석은 뒤에 한 권 더) + 가운데 흰 배지.
 * 주황은 그림 안 작은 면적에만 — 서비스 큰 면에는 쓰지 않는다.
 */
const BooksArt = ({ badge, three }: { badge: string; three: boolean }) => {
  // 한 화면에 그림이 둘 이상 있어도 그라데이션 id 가 겹치지 않게
  const id = useId().replace(/:/g, '');
  const y = three ? 12 : 0; // 세 권일 때 앞 두 권을 조금 내려 뒤 책이 보이게
  return (
    <svg viewBox='0 0 220 180'>
      <defs>
        <linearGradient id={`${id}o`} x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='#ffbe73' />
          <stop offset='1' stopColor='#ff8a5c' />
        </linearGradient>
        <linearGradient id={`${id}n`} x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='#1b336a' />
          <stop offset='1' stopColor='#14294e' />
        </linearGradient>
        <linearGradient id={`${id}b`} x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='#5b8cff' />
          <stop offset='1' stopColor='#2f66f0' />
        </linearGradient>
        <filter id={`${id}s`} x='-30%' y='-30%' width='160%' height='160%'>
          <feDropShadow
            dx='0'
            dy='8'
            stdDeviation='7'
            floodColor='#14294e'
            floodOpacity='.22'
          />
        </filter>
      </defs>
      {three && (
        <g filter={`url(#${id}s)`} transform='rotate(-2 110 92)'>
          <rect
            x='74'
            y='26'
            width='72'
            height='104'
            rx='7'
            fill={`url(#${id}b)`}
          />
          <rect
            x='86'
            y='46'
            width='44'
            height='5'
            rx='2.5'
            fill='#fff'
            opacity='.9'
          />
        </g>
      )}
      <g filter={`url(#${id}s)`} transform='rotate(-11 74 96)'>
        <rect
          x='38'
          y={32 + y}
          width='72'
          height='104'
          rx='7'
          fill={`url(#${id}o)`}
        />
        <rect
          x='50'
          y={52 + y}
          width='46'
          height='5'
          rx='2.5'
          fill='#fff'
          opacity='.9'
        />
        <rect
          x='50'
          y={62 + y}
          width='30'
          height='5'
          rx='2.5'
          fill='#fff'
          opacity='.6'
        />
      </g>
      <g filter={`url(#${id}s)`} transform='rotate(9 150 92)'>
        <rect
          x='112'
          y={32 + y}
          width='72'
          height='104'
          rx='7'
          fill={`url(#${id}n)`}
        />
        <rect
          x='124'
          y={52 + y}
          width='46'
          height='5'
          rx='2.5'
          fill='#fff'
          opacity='.9'
        />
        <rect
          x='124'
          y={62 + y}
          width='28'
          height='5'
          rx='2.5'
          fill='#fff'
          opacity='.55'
        />
      </g>
      <g filter={`url(#${id}s)`} transform={`translate(110 ${124 + y})`}>
        <circle r='27' fill='#fff' />
        <text
          y='7'
          textAnchor='middle'
          fontSize='19'
          fontWeight='800'
          fill='#1f4fc4'
        >
          {badge}
        </text>
      </g>
      <path d='M196 22l3 7 7 3-7 3-3 7-3-7-7-3 7-3z' fill='#f5b83d' />
      <path d='M22 150l2 5 5 2-5 2-2 5-2-5-5-2 5-2z' fill='#9db7ff' />
    </svg>
  );
};
