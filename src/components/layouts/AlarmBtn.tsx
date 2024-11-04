import Icon from '@components/icon/Icon';
import styles from './AlarmBtn.module.scss';

export default function AlarmBtn() {
  return (
    <button className={styles.iconBtn}>
      <Icon name="bell" color="grayLv4" />
      <span className="a11y-hidden">알림</span>
      <span
        style={{
          position: 'absolute',
          top: '0',
          right: '0',
          border: '2px solid #fff',
          display: 'inline-block',
          padding: '0 0.5em',
          borderRadius: '4rem',
          backgroundColor: '#29D063',
          color: '#fff',
          fontSize: '1.2rem',
          fontWeight: 'bold',
        }}
      >
        1
      </span>
    </button>
  );
}
