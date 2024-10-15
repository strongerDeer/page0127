import styles from './Loading.module.scss';

export default function Loading() {
  return (
    <div className={styles.book}>
      <div className={styles.inner}>
        <div className={styles.left}></div>
        <div className={styles.middle}></div>
        <div className={styles.right}></div>
      </div>
      <ul className={styles.pages}>
        {[...Array(18)].map((_, i) => (
          <li key={i} className={styles.page}></li>
        ))}
      </ul>
    </div>
  );
}
