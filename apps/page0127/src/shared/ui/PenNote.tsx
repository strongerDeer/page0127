import styles from './PenNote.module.css';

type PenNoteProps = {
  children: React.ReactNode;
  className?: string;
  /** 좁은 화면(767px 이하)에선 숨긴다 — 자리가 모자라 본문을 덮거나 쪽을 넘치게 할 때 */
  hideOnMobile?: boolean;
};

/**
 * 연필로 적은 듯한 짧은 메모(장식). 화면 낭독기는 건너뛴다 — 같은 내용이 본문에 이미 있다.
 * ⚠️ 글꼴이 쓰는 글자만 담은 서브셋이라, 새 문장을 쓰면 PenNote.module.css 의 안내대로 다시 만든다.
 */
export const PenNote = ({
  children,
  className = '',
  hideOnMobile = false,
}: PenNoteProps) => (
  <p
    aria-hidden='true'
    className={`${styles.note} ${hideOnMobile ? styles.desktopOnly : ''} ${className}`}
  >
    {children}
  </p>
);
