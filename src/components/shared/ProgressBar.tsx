import Icon from '@components/icon/Icon';
import styles from './ProgressBar.module.scss';
export default function ProgressBar({
  value,
  total,
  height = '2rem',
  hiddenText,
}: {
  value: number;
  total: number;
  height?: string;
  hiddenText?: boolean;
}) {
  return (
    <div className={styles.progressBar}>
      <div className={styles.progress} style={{ height: height }}>
        {/* 읽은 책 */}
        <div
          className={styles.bar}
          style={{
            width: `${(value / Math.max(total, value)) * 100}%`,
          }}
        ></div>

        {/* 목표 */}
        <div
          className={styles.total}
          style={{
            left: `${(total / Math.max(total, value)) * 100}%`,
          }}
        >
          <Icon name="flag" size="2.8rem" />
        </div>
      </div>

      {!hiddenText && (
        <div className={styles.text}>
          <strong>{value}</strong>/ {total}
        </div>
      )}
    </div>
  );
}
