// src/components/atoms/Button/Button.types.ts
export type ButtonVariant = 'solid' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonColor = 'primary' | 'secondary' | 'danger';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  full?: boolean;
  children?: React.ReactNode;
}
