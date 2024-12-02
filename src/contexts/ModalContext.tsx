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
import Portal from '@components/shared/Portal';
import WindowModal from '@components/shared/WindowModal';

export type ModalProps = ComponentProps<typeof WindowModal>;
type ModalOptions = Omit<ModalProps, 'open'>;

interface ModalContextValue {
  open: (option: ModalOptions) => void;
  close: () => void;
}

const ModalContext = createContext<ModalContextValue | undefined>(undefined);

const defaultValues: ModalProps = {
  open: false,
  title: null,
  body: null,
  onButtonClick: () => {},
  closeModal: () => {},
};

export function ModalContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [modalState, setModalState] = useState<ModalProps>(defaultValues);

  // useCallback: 리렌더링시에 함수를 새롭게 만들지 않겠다.
  const close = useCallback(() => {
    setModalState(defaultValues);
  }, []);

  const open = useCallback(
    (options: ModalOptions) => {
      setModalState({
        ...options,
        open: true,
        closeModal: close,
      });
    },
    [close],
  );

  // useMemo: 리렌더링 사이에 계산 결과를 캐싱
  const value = useMemo(() => ({ open, close }), [open, close]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return (
    <ModalContext.Provider value={value}>
      {children}
      {mounted && modalState.open && (
        <Portal>
          <WindowModal {...modalState} />
        </Portal>
      )}
    </ModalContext.Provider>
  );
}

export const useModalContext = (): ModalContextValue => {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error('ModalContext 안에서 사용해주세요!');
  }
  return context;
};
