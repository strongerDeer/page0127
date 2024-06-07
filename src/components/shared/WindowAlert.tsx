import Dimmed from './Dimmed';
import Button from './Button';
import styles from './Window.module.scss';
import Icon from '@components/icon/Icon';

interface AlertProps {
  open: boolean;
  title: string | null;
  body?: React.ReactNode;
  buttonLabel?: string;
  onButtonClick: () => void;
}

export default function WindowAlert({
  open,
  title,
  body,
  buttonLabel,
  onButtonClick,
}: AlertProps) {
  if (open === false) {
    return null;
  }
  return (
    <Dimmed>
      <div className={styles.window}>
        <div className={styles.window__contents}>
          <Icon name="alert" color="primary" />
          <div>
            {title && <h2>{title}</h2>}
            {body && <p>{body}</p>}
          </div>
        </div>
        <div className={styles.window__btns}>
          <Button variant="link" onClick={onButtonClick}>
            {buttonLabel ? buttonLabel : '확인'}
          </Button>
        </div>
      </div>
    </Dimmed>
  );
}
