import { createGlobalTheme, createThemeContract } from '@vanilla-extract/css';

export const colors = createThemeContract({
  primary: null,
  secondary: null,
  background: null,
});

export const lightTheme = createGlobalTheme(':root', {
  colors: {
    primary: '#29d063',
    secondary: '#0c3a2d',
    background: '#ffffff',
  },
});
