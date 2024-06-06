import Link from 'next/link';

import { assignInlineVars } from '@vanilla-extract/dynamic';
import { buttonStyle, variant_color } from './Button.css';
import { ButtonProps } from './types';
import clsx from 'clsx';

export default function Button(props: ButtonProps) {
  const {
    href,
    type = 'button',
    children = '버튼',
    variant = 'solid',
    size = 'md',
    className,
    full,
    color = 'primary',
    ...rest
  } = props;

  if (href) {
    return (
      <Link
        href={href}
        target={href.includes('http') ? '_blank' : '_self'}
        style={assignInlineVars({
          [variant_color]: `var(--${color})`,
        })}
        className={buttonStyle({ variant: variant })}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      style={assignInlineVars({
        [variant_color]: `var(--${color})`,
      })}
      className={clsx([buttonStyle({ variant, size })], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
