import { useCallback, useState } from 'react';
import { FormValues } from '@models/sign';

export const useForm = <T extends Partial<FormValues>>(initialState: T) => {
  // controlled 방식 사용 : state 사용
  const [formValues, setFormValues] = useState<T>(initialState);
  const [inputDirty, setInputDirty] = useState<Partial<FormValues>>({});

  // 계속해서 리렌더링 발생. 외부 값의 영향을 받지 않음으로 useCallback 사용
  const handleFormValues = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormValues((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleBlur = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setInputDirty((prev) => ({
      ...prev,
      [name]: 'true',
    }));
  }, []);

  return {
    formValues,
    inputDirty,
    handleFormValues,
    handleBlur,
  };
};
