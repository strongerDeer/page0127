'use client';
import Modal from '@components/shared/Modal';
import {
  ComponentProps,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

export type ModalProps = ComponentProps<typeof Modal>;
type ModalOptions = Omit<ModalProps, 'open'>;

export interface ModalContextValue {
  open: (option: ModalOptions) => void;
  close: () => void;
}

const Context = createContext<ModalContextValue | undefined>(undefined);

const defaultValues: ModalProps = {
  isOpened: false,
  title: '',
  body: null,
  actionClickEvent: () => {},
  closeModal: () => {},
};

export const ModalContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const rootRef = useRef<Element | null>(null);
  const [modalState, setModalState] = useState<ModalProps>(defaultValues);

  // useCallback: 리렌더링시에 함수를 새롭게 만들지 않겠다.
  const close = useCallback(() => {
    setModalState(defaultValues);
  }, []);

  const open = useCallback((options: ModalOptions) => {
    setModalState({ ...options, isOpened: true });
  }, []);

  // useMemo: 리렌더링 사이에 계산 결과를 캐싱
  const values = useMemo(
    () => ({
      open,
      close,
    }),
    [open, close],
  );

  useEffect(() => {
    const root = document.createElement('div');
    rootRef.current = root;
    document.body.appendChild(root);

    // return () => {
    //   if (rootRef.current) {
    //     document.body.removeChild(rootRef.current);
    //   }
    // };
  }, []);

  return (
    <Context.Provider value={values}>
      {children}
      {rootRef.current
        ? createPortal(<Modal {...modalState} />, rootRef.current)
        : null}
    </Context.Provider>
  );
};

export const useModalContext = () => {
  const values = useContext(Context);

  if (values === null) {
    throw new Error('ModalContext 안에서 사용해주세요!');
  }
  return values;
};
