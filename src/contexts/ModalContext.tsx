'use client';
import Modal from '@components/shared/Modal';
import {
  ComponentProps,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

type ModalProps = ComponentProps<typeof Modal>;
type ModalOptions = Omit<ModalProps, 'open'>;

interface ModalContextValue {
  open: (option: ModalOptions) => void;
  close: () => void;
}

const Context = createContext<ModalContextValue | undefined>(undefined);

const defaultValues: ModalProps = {
  isOpened: false,
  body: null,
  actionClickEvent: () => {},
  closeModal: () => {},
};

export const ModalContext = ({ children }: { children: React.ReactNode }) => {
  const rootRef = useRef<Element | null>(null);
  const [modalState, setModalState] = useState<ModalProps>(defaultValues);

  const open = (options: ModalOptions) => {
    setModalState({ ...options, isOpened: true });
  };
  const close = () => {
    setModalState(defaultValues);
  };

  useEffect(() => {
    const root = document.createElement('div');
    rootRef.current = root;
    document.body.appendChild(root);

    return () => {
      if (rootRef.current) {
        document.body.removeChild(rootRef.current);
      }
    };
  }, []);

  return (
    <Context.Provider value={{ open, close }}>
      {children}
      {rootRef.current
        ? createPortal(<Modal {...modalState} />, rootRef.current)
        : null}
    </Context.Provider>
  );
};

export const useModalContext = () => {
  const value = useContext(Context);

  if (value === null) {
    throw new Error('ModalContext 안에서 사용해주세요!');
  }
  return value;
};
