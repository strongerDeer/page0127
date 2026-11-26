import { toWords } from '../model/wordFill';

const WORDS = toWords([
  {
    text: '다 읽고 나면 기억은 흐려지고, 기록은 메모 앱에, SNS에, 사진첩에 흩어져요. 그래서 ',
  },
  { text: '내 서재에 꽂아', key: true },
  { text: ' 나를 보여 주기로 했어요.' },
]);

/**
 * 1장 "왜 page0127.인가요"의 문장 — 이 쪽을 펼치면 단어가 옅은 색에서 차례로 진해진다.
 *
 * 서버 컴포넌트. 차오르는 연출은 HomeBook 이 쪽에 data-lit 을 켜고 CSS 가 단어마다
 * 조금씩 늦게(--book-word) 색을 바꾼다 — 쪽이 화면에 붙어 움직이지 않아서, 예전처럼
 * 문단 위치로 진행도를 재면 늘 0 에 머물러 회색으로 남았다(2026-11-17 HJ 스크린샷).
 * 문장은 처음부터 진한 색이다: JS 실패·동작 줄이기면 그대로 읽힌다(옅게 하는 건 책 모드 CSS).
 */
export const Manifesto = () => (
  <p className='display-xl mx-auto mt-6 max-w-4xl text-balance'>
    {WORDS.map((w, i) => (
      <span
        key={i}
        data-word=''
        // 단어 순번 — 차오르는 지연(i × 45ms)에 쓴다. 연속값이라 클래스로 표현할 수 없다
        style={{ '--book-word': i } as React.CSSProperties}
        className={w.key ? 'text-primary' : 'text-text-strong'}
      >
        {w.text}{' '}
      </span>
    ))}
  </p>
);
