import Link from 'next/link';
import { assignInlineVars } from '@vanilla-extract/dynamic';
import type { ButtonProps } from './Button.types';
import clsx from 'clsx';
import { buttonStyle, variant_color } from './Button.css';

export const Button = ({
  href,
  type = 'button',
  children = '버튼',
  variant = 'solid',
  size = 'md',
  className,
  full,
  color = 'primary',
  ...rest
}: ButtonProps) => {
  const classStyle = clsx([buttonStyle({ variant, size, full })], className);
  const styleVars = assignInlineVars({ [variant_color]: `var(--${color})` });

  if (href) {
    return (
      <Link
        href={href}
        target={href.includes('https') ? '_blank' : '_self'}
        style={styleVars}
        className={classStyle}
      >
        {children}
      </Link>
    );
  }

  return (
    <button type={type} style={styleVars} className={classStyle} {...rest}>
      {children}
    </button>
  );
};
