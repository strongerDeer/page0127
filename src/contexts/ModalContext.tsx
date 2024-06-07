'use client';
import {
  ComponentProps,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import WindowModal from '@components/shared/WindowModal';

export type ModalProps = ComponentProps<typeof WindowModal>;
type ModalOptions = Omit<ModalProps, 'open'>;

export interface ModalContextValue {
  open: (option: ModalOptions) => void;
  close: () => void;
}

const Context = createContext<ModalContextValue | undefined>(undefined);

const defaultValues: ModalProps = {
  open: false,
  title: null,
  body: null,
  onButtonClick: () => {},
  closeModal: () => {},
};

export const ModalContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  let [portalElement, setPortalElement] = useState<Element | null>(null);
  const [modalState, setModalState] = useState<ModalProps>(defaultValues);

  // useCallback: 리렌더링시에 함수를 새롭게 만들지 않겠다.
  const close = useCallback(() => {
    setModalState(defaultValues);
  }, []);

  const open = useCallback((options: ModalOptions) => {
    setModalState({ ...options, open: true });
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
    setPortalElement(document.getElementById('root-portal'));
  }, []);

  return (
    <Context.Provider value={values}>
      {children}
      {portalElement
        ? createPortal(<WindowModal {...modalState} />, portalElement)
        : null}
    </Context.Provider>
  );
};

export const useModalContext = (): ModalContextValue => {
  const values = useContext(Context);

  if (!values) {
    throw new Error('ModalContext 안에서 사용해주세요!');
  }
  return values;
};
