import Agreement from '@components/shared/Agreement';
import Button from '@components/shared/Button';
import ButtonFixedBottom from '@components/shared/ButtonFixedBottom';
import { MEMBERSHIP_LIST } from '@constants/membership';
import { useCallback, useState } from 'react';

export default function Terms({
  onNext,
}: {
  onNext: (terms: string[]) => void;
}) {
  const isMobile = false;
  const [termsAgreements, setTermsAgreements] = useState(() => {
    return MEMBERSHIP_LIST.reduce<Record<string, boolean>>(
      (prev, term) => ({
        ...prev,
        [term.id]: false,
      }),
      {},
    );
  });

  const handleAllAgreement = useCallback((checked: boolean) => {
    setTermsAgreements((prev) => {
      return Object.keys(prev).reduce(
        (item, key) => ({
          ...item,
          [key]: checked,
        }),
        {},
      );
    });
  }, []);
  const isAllAgreement = Object.values(termsAgreements).every(
    (checked) => checked,
  );
  console.log(isAllAgreement);
  return (
    <div>
      <Agreement>
        <Agreement.Title
          checked={isAllAgreement}
          onChange={(_, checked) => handleAllAgreement(checked)}
        >
          약관에 동의
        </Agreement.Title>
        {MEMBERSHIP_LIST.map(({ id, title, link, required }) => (
          <Agreement.Description
            key={id}
            link={link}
            checked={termsAgreements[id]}
            onChange={(_, checked) =>
              setTermsAgreements((prev) => ({
                ...prev,
                [id]: checked,
              }))
            }
          >
            {required ? '(필수) ' : '(선택) '}
            {title}
          </Agreement.Description>
        ))}
      </Agreement>

      {isMobile ? (
        <ButtonFixedBottom
          text="다음"
          disabled={!isAllAgreement}
          onClick={() => onNext(Object.keys(termsAgreements))}
        />
      ) : (
        <Button
          size="lg"
          full
          disabled={!isAllAgreement}
          onClick={() => onNext(Object.keys(termsAgreements))}
        >
          다음
        </Button>
      )}
    </div>
  );
}
