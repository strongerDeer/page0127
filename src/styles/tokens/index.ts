import { colors } from './colors';
import { spacing } from './spacing';
import { shadows } from './shadows';

export const tokens = {
  colors,
  spacing,
  shadows,
} as const;

export * from './colors';
export * from './spacing';
export * from './shadows';
