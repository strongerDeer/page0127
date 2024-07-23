'use client';
import styles from './ButtonFixedBottom.module.scss';
import Button from '@components/shared/Button';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ButtonFixedBottomProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement | HTMLAnchorElement> {
  text: string;
  type?: 'button' | 'submit' | 'reset';
}
export default function ButtonFixedBottom({
  text,
  type = 'button',
  disabled = false,
  onClick,
}: ButtonFixedBottomProps) {
  let [portalElement, setPortalElement] = useState<Element | null>(null);

  useEffect(() => {
    setPortalElement(document.getElementById('root-portal'));
  }, []);

  if (portalElement === null) {
    return null;
  }

  return createPortal(
    <div className={styles.buttonFixedBottom}>
      <Button full size="lg" onClick={onClick} type={type} disabled={disabled}>
        {text}
      </Button>
    </div>,
    portalElement,
  );
}
