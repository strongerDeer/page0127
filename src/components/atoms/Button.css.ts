import { style, createVar } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { tokens } from '@/styles/tokens';

export const variant_color = createVar();

const baseButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: tokens.colors.light.primary,
  transition: 'all 0.2s ease-in-out',
  cursor: 'pointer',
  fontWeight: 500,
  border: 'none',
  textDecoration: 'none',
});

export const buttonStyle = recipe({
  base: baseButton,

  variants: {
    variant: {
      solid: {
        backgroundColor: variant_color,
        color: 'white',
        ':hover': {
          opacity: 0.9,
        },
      },
      outline: {
        backgroundColor: 'transparent',
        border: `1px solid ${variant_color}`,
        color: variant_color,
        ':hover': {
          backgroundColor: variant_color,
          color: 'white',
        },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: variant_color,
        ':hover': {
          backgroundColor: `color-mix(in srgb, ${variant_color} 10%, transparent)`,
        },
      },
    },
    size: {
      sm: {
        // padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
        // fontSize: tokens.fontSize.sm,
      },
      md: {
        // padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
        // fontSize: tokens.fontSize.base,
      },
      lg: {
        // padding: `${tokens.spacing[4]} ${tokens.spacing[6]}`,
        // fontSize: tokens.fontSize.lg,
      },
    },
    full: {
      true: {
        width: '100%',
      },
    },
  },
});
