import Link from 'next/link';

import { Plus } from 'lucide-react';

import styles from './NextBookSlot.module.css';

/**
 * 책장 마지막 칸 다음의 점선 빈칸 — 다음 책이 꽂힐 자리 (주인에게만)
 *
 * 글자 없이 점선 칸과 위쪽 + 버튼만 둔다(HJ, 2026-11-17). 마우스를 올리거나 Tab 으로
 * 오면 + 가 "도서 추가"로 펼쳐진다. 터치 기기는 올리기가 없어 처음부터 펼쳐 둔다.
 * 칸 전체가 링크라 누를 자리가 넓다.
 *
 * 높이는 선반이 정한다 — 끝칸 안의 첫 요소를 책 높이로 맞춘다(PublicBookShelf.module.css .slot).
 */
export const NextBookSlot = () => (
  <Link href='/books/add' prefetch={false} className={styles.slot}>
    <span className={styles.pill}>
      <Plus aria-hidden className={styles.icon} />
      <span className={styles.label}>도서 추가</span>
    </span>
  </Link>
);
