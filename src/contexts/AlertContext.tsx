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
import WindowAlert from '@components/shared/WindowAlert';

export type AlertProps = ComponentProps<typeof WindowAlert>;
type AlertOptions = Omit<AlertProps, 'open'>;

interface AlertContextValue {
  open: (option: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

const defaultValues: AlertProps = {
  open: false,
  title: null,
  body: null,
  onButtonClick: () => {},
};

export function AlertContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [alertState, setAlertState] = useState<AlertProps>(defaultValues);

  const close = useCallback(() => {
    setAlertState(defaultValues);
  }, []);

  const open = useCallback(
    ({ onButtonClick, ...options }: AlertOptions) => {
      setAlertState({
        ...options,
        onButtonClick: () => {
          close();
          onButtonClick();
        },
        open: true,
      });
    },
    [close],
  );

  const value = useMemo(() => ({ open }), [open]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return (
    <AlertContext.Provider value={value}>
      {children}
      {mounted && alertState.open && (
        <Portal>
          <WindowAlert {...alertState} />
        </Portal>
      )}
    </AlertContext.Provider>
  );
}

export const useAlertContext = (): AlertContextValue => {
  const context = useContext(AlertContext);

  if (!context) {
    throw new Error('AlertContext 안에서 사용해주세요!');
  }
  return context;
};
