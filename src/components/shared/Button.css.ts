import { recipe } from '@vanilla-extract/recipes';
import { createVar } from '@vanilla-extract/css';
export const variant_color = createVar();

export const buttonStyle = recipe({
  base: {
    borderRadius: '0.4em',
    padding: '0 1em',
    height: '2.4em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    // @ts-ignore
    '&:enabled': {
      cursor: 'pointer',
    },
    '&:disabled': {
      border: '1px solid var(--grayLv2)',
      backgroundColor: 'var(--grayLv2)',
      color: 'var(--grayLv3)',
    },
  },
  variants: {
    size: {
      sm: {
        fontSize: '0.875em',
      },
      md: {
        fontSize: '1em',
      },
      lg: {
        fontSize: '1.125em',
      },
    },
    variant: {
      solid: {
        backgroundColor: variant_color,
        color: '#fff',
      },
      outline: {
        borderColor: variant_color,
        color: variant_color,
        // background: 'red',
      },
    },
  },
});

// &.solid {
//
// }
// &.outline {
//   border: 1px solid var(--primary);
//   color: var(--primary);
// }

// &.full {
//   width: 100%;
// }
