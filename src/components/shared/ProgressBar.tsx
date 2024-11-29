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
  const maxValue = Math.max(total, value);
  const progressWidth = (value / maxValue) * 100;
  const flagPosition = (total / maxValue) * 100;
  return (
    <div
      className={styles.progressBar}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`진행률 ${progressWidth.toFixed(1)}`}
    >
      <div className={styles.progress} style={{ height: height }}>
        {/* 읽은 책 */}
        <div
          className={styles.bar}
          style={{
            width: `${progressWidth}%`,
          }}
        ></div>

        {/* 목표 */}
        <div
          className={styles.total}
          style={{
            left: `${flagPosition}%`,
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
