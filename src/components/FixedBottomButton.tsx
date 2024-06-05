'use client';
import styles from './FixedBottomButton.module.scss';
import Button from '@components/shared/Button';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface FixedBottomButtonProps {
  text: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: () => void;
}
export default function FixedBottomButton({
  text,
  type = 'button',
  disabled = false,
  onClick,
}: FixedBottomButtonProps) {
  let [portalElement, setPortalElement] = useState<Element | null>(null);

  useEffect(() => {
    setPortalElement(document.getElementById('root-portal'));
  }, []);

  if (portalElement === null) {
    return null;
  }

  return createPortal(
    <div className={styles.fixedBottomButton}>
      <Button full size="lg" onClick={onClick} type={type} disabled={disabled}>
        {text}
      </Button>
    </div>,
    portalElement,
  );
}
