export type ButtonProps = {
  as?: 'a';

  href?: string;
  type?: 'button' | 'submit' | 'reset';
  children?: React.ReactNode;
  className?: string;
  variant?: 'solid' | 'outline' | 'link';
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
  color?: string;

  // sns?: string;

  // size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg';
  // variant?: 'solid' | 'outline' | 'outlineSolid' | 'text';
} & React.ButtonHTMLAttributes<HTMLButtonElement | HTMLAnchorElement>;
