'use client';
import Alert from '@components/shared/Alert';
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

export type AlertProps = ComponentProps<typeof Alert>;
type AlertOptions = Omit<AlertProps, 'open'>;

export interface AlertContextValue {
  open: (option: AlertOptions) => void;
}

const Context = createContext<AlertContextValue | undefined>(undefined);

const defaultValues: AlertProps = {
  isOpened: false,
  title: '',
  body: null,
  closeAlert: () => {},
};

export const AlertContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const rootRef = useRef<Element | null>(null);
  const [alertState, setAlertState] = useState<AlertProps>(defaultValues);

  const close = useCallback(() => {
    setAlertState(defaultValues);
  }, []);

  const open = useCallback(
    ({ closeAlert, ...options }: AlertOptions) => {
      setAlertState({
        ...options,
        isOpened: true,
        closeAlert: () => {
          close();
        },
      });
    },
    [close],
  );

  const values = useMemo(
    () => ({
      open,
    }),
    [open],
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
        ? createPortal(<Alert {...alertState} />, rootRef.current)
        : null}
    </Context.Provider>
  );
};

export const useAlertContext = () => {
  const values = useContext(Context);

  if (values === null) {
    throw new Error('AlertContext 안에서 사용해주세요!');
  }
  return values;
};
