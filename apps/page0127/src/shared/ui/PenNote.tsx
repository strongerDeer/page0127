import styles from './PenNote.module.css';

type PenNoteProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * 연필로 적은 듯한 짧은 메모(장식). 화면 낭독기는 건너뛴다 — 같은 내용이 본문에 이미 있다.
 * ⚠️ 글꼴이 쓰는 글자만 담은 서브셋이라, 새 문장을 쓰면 PenNote.module.css 의 안내대로 다시 만든다.
 */
export const PenNote = ({ children, className = '' }: PenNoteProps) => (
  <p aria-hidden='true' className={`${styles.note} ${className}`}>
    {children}
  </p>
);
