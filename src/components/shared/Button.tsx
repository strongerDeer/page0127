import { clsx } from 'clsx';
import Link from 'next/link';
import styles from './Button.module.scss';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  children?: React.ReactNode;
  className?: string;
  variant?: string;
  size?: string;
  full?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export default function Button(props: ButtonProps) {
  const {
    href,
    type = 'button',
    children = '버튼',
    variant = 'solid',
    size = 'md',
    className,
    full,
    ...rest
  } = props;

  const classList = clsx([
    styles.btn,
    styles[variant],
    styles[size],
    full && styles['full'],

    className,
  ]);

  if (href) {
    return (
      <Link
        href={href}
        target={href.includes('http') ? '_blank' : '_self'}
        className={classList}
      >
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classList} {...rest}>
      {children}
    </button>
  );
}
