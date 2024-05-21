import Button from './Button';
import Dimmed from './Dimmed';

interface AlertProps {
  isOpened: boolean;
  title: string;
  body: React.ReactNode;
  closeButtonLabel?: string;
  closeAlert?: () => void;
}

export default function Alert({
  isOpened,
  title,
  body,
  closeButtonLabel,
  closeAlert,
}: AlertProps) {
  if (isOpened === false) {
    return null;
  }
  return (
    <Dimmed>
      <div className="w-72 min-h-40 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg flex flex-col overflow-hidden z-[51]">
        <div className="grow p-4 text-gray-500 text-center flex flex-col justify-center items-center">
          {title && (
            <h2 className="font-bold text-lg text-gray-950">{title}</h2>
          )}
          {body}
        </div>

        <Button onClick={closeAlert}>
          {closeButtonLabel ? closeButtonLabel : '닫기'}
        </Button>
      </div>
    </Dimmed>
  );
}
