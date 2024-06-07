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
import WindowAlert from '@components/shared/WindowAlert';

export type AlertProps = ComponentProps<typeof WindowAlert>;
type AlertOptions = Omit<AlertProps, 'open'>;

export interface AlertContextValue {
  open: (option: AlertOptions) => void;
}

const Context = createContext<AlertContextValue | undefined>(undefined);

const defaultValues: AlertProps = {
  open: false,
  title: null,
  body: null,
  onButtonClick: () => {},
};

export const AlertContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  let [portalElement, setPortalElement] = useState<Element | null>(null);
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

  const values = useMemo(
    () => ({
      open,
    }),
    [open],
  );

  useEffect(() => {
    setPortalElement(document.getElementById('root-portal'));
  }, []);

  return (
    <Context.Provider value={values}>
      {children}
      {portalElement
        ? createPortal(<WindowAlert {...alertState} />, portalElement)
        : null}
    </Context.Provider>
  );
};

export const useAlertContext = (): AlertContextValue => {
  const values = useContext(Context);

  if (!values) {
    throw new Error('AlertContext 안에서 사용해주세요!');
  }
  return values;
};
