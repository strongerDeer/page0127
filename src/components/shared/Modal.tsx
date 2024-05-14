import { title } from 'process';
import Dimmed from './Dimmed';

interface ModalProps {
  isOpened: boolean;
  title?: string;
  body: React.ReactNode;
  actionButtonLabel?: string;
  actionClickEvent: () => void;

  closeButtonLabel?: string;
  closeModal?: () => void;
}

export default function Modal({
  isOpened,
  title,
  body,
  actionButtonLabel,
  actionClickEvent,
  closeButtonLabel,
  closeModal,
}: ModalProps) {
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
        <div className=" flex gap-[1px] bg-gray-300 h-12">
          <button
            type="button"
            onClick={closeModal}
            className="bg-white grow rounded-bl-lg border-t border-gray-300"
          >
            {closeButtonLabel ? closeButtonLabel : '닫기'}
          </button>
          <button
            type="button"
            onClick={actionClickEvent}
            className="bg-blue-400 text-white grow rounded-br-lg"
          >
            {actionButtonLabel ? actionButtonLabel : '확인'}
          </button>
        </div>
      </div>
    </Dimmed>
  );
}
