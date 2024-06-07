import Dimmed from './Dimmed';
import Button from './Button';
import styles from './Window.module.scss';
import Icon from '@components/icon/Icon';

interface ModalProps {
  open: boolean;
  title: string | null;
  body?: React.ReactNode;
  buttonLabel?: string;
  onButtonClick: () => void;
  closeButtonLabel?: string;
  closeModal?: () => void;
}

export default function WindowModal({
  open,
  title,
  body,
  buttonLabel,
  onButtonClick,
  closeButtonLabel,
  closeModal,
}: ModalProps) {
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
          <Button variant="link" color="grayLv4" onClick={closeModal}>
            {closeButtonLabel ? closeButtonLabel : '닫기'}
          </Button>
          <Button variant="link" onClick={onButtonClick}>
            {buttonLabel ? buttonLabel : '확인'}
          </Button>
        </div>
      </div>
    </Dimmed>
  );
}
