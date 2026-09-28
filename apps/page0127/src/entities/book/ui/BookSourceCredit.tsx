import { toBookCredit } from '../model/bookSource';

type BookSourceCreditProps = {
  source: string | null | undefined;
  providerItemId: string | null | undefined;
  isbn: string;
  className?: string;
};

/**
 * 도서정보 출처 표기 — **약관상 의무**다.
 *
 * YES24 Open API 이용약관은 도서가 노출되는 화면에 출처 표기와 상품 상세페이지
 * 링크를 함께 제공할 것을 요구한다. 지우거나 숨기면 이용 제한 사유가 된다.
 *
 * 출처를 모르는 옛 행(`source` 가 NULL)에는 아무것도 그리지 않는다 —
 * 모르는 출처를 지어내는 것이 표기를 빠뜨리는 것보다 나쁘다. 백필이 채우면 나타난다.
 */
export const BookSourceCredit = ({
  source,
  providerItemId,
  isbn,
  className,
}: BookSourceCreditProps) => {
  const credit = toBookCredit(source, providerItemId, isbn);

  if (!credit) return null;

  return (
    <p className={className ?? 'text-xs text-text-subtle'}>
      도서 정보·이미지 제공{' '}
      <a
        href={credit.href}
        target='_blank'
        // noopener 가 없으면 새 창이 window.opener 로 이 페이지를 조작할 수 있다
        rel='noopener noreferrer'
        className='underline underline-offset-2 hover:text-text-strong'
      >
        {credit.providerName}
      </a>
    </p>
  );
};
