import styles from './ProgressBar.module.scss';
export default function ProgressBar({
  value,
  total,
  height = '2rem',
  hiddenText,
}: {
  value: number;
  total: number;
  height: string;
  hiddenText?: boolean;
}) {
  return (
    <div className={styles.progressBar}>
      <div className={styles.progress} style={{ height: height }}>
        <div
          className={styles.bar}
          style={{
            width: `${(value / total) * 100}%`,
          }}
        ></div>
      </div>

      {!hiddenText && (
        <div className={styles.text}>
          <strong>{value}</strong>/ {total}
        </div>
      )}
    </div>
  );
}
