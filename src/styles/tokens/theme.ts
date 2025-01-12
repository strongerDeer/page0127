import { createGlobalTheme } from '@vanilla-extract/css';
import { colors, spacing, shadows } from '.';

export const vars = createGlobalTheme(':root', {
  colors: colors.light,
  spacing,
  shadows: {
    1: `${shadows[1].x}px ${shadows[1].y}px ${shadows[1].blur}px ${shadows[1].spread}px ${shadows[1].color}`,
  },
});
