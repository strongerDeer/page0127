import { recipe } from '@vanilla-extract/recipes';
import { createVar } from '@vanilla-extract/css';
export const variant_color = createVar();

export const buttonStyle = recipe({
  base: {
    verticalAlign: 'middle',
    borderRadius: '0.4em',
    padding: '0 1em',
    height: '2.4em',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s',
    // @ts-ignore
    '&:enabled': {
      cursor: 'pointer',
    },
    '&:disabled': {
      border: '1px solid var(--grayLv2)',
      backgroundColor: 'var(--grayLv2)',
      color: 'var(--grayLv3)',
    },

    '& svg': {
      maxHeight: '1.3em',
      aspectRatio: '1/1',
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
        padding: '0 1.2em',
        height: '2.8em',
        fontSize: '1em',
      },
    },
    variant: {
      solid: {
        backgroundColor: variant_color,
        color: '#fff',
      },
      outline: {
        border: '1px solid',
        borderColor: variant_color,
        color: variant_color,
        // background: 'red',
      },
      link: {
        color: variant_color,

        '&:hover': {
          backgroundColor: 'var(--activation)',
        },
      },
    },
    full: {
      true: {
        width: '100%',
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
