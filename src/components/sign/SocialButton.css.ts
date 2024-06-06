import { recipe } from '@vanilla-extract/recipes';
import { createVar } from '@vanilla-extract/css';
export const variant_color = createVar();
export const buttonStyle = recipe({
  base: {
    width: '100%',
    border: '1px solid #ddd',
  },
  variants: {
    variant: {
      solid: {
        backgroundColor: variant_color,
      },
      outline: {
        borderColor: variant_color,
        color: variant_color,
        // background: 'red',
      },
    },
  },
});
