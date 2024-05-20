import { clsx } from 'clsx';
import Link from 'next/link';
import styles from './Button.module.scss';

interface ButtonProps {
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  children?: React.ReactNode;
  className?: string;
  variant?: string;
  size?: string;
  disabled?: boolean;
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
    disabled,
    onClick,
  } = props;

  const classList = clsx([
    styles.btn,
    styles[variant],
    styles[size],
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
    <button
      type={type}
      className={classList}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
