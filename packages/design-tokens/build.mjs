import StyleDictionary from 'style-dictionary';

/**
 * Figma 전용 토큰 — CSS 로는 내보내지 않는다.
 * 코드에서 간격·모서리는 Tailwind 기본 스케일을 쓰므로 CSS 변수가 필요 없다.
 * 이 값들은 Figma 에서 디자인할 때 임의값이 나오지 않게 막는 용도로만 존재한다.
 */
const FIGMA_ONLY = ['space', 'corner'];

/**
 * 다크 토큰을 @media 블록으로 감싸 내보내는 포맷.
 *
 * 기본 'css/variables' 를 쓸 수 없는 이유:
 * 그건 selector 하나만 감싸주는데, 우리는 `@media (…) { :root { … } }` 로
 * 두 겹을 감싸야 한다. OS 설정을 따르기로 했으므로 .dark 클래스 전략이 아니다.
 *
 * 이름에서 'dark-' 접두사를 떼는 이유:
 * 토큰 파일에서는 라이트와 이름이 겹치지 않게 dark 아래 두지만,
 * CSS 로 나올 때는 같은 변수명이어야 라이트 값을 덮는다.
 */
StyleDictionary.registerFormat({
  name: 'css/variables-dark-media',
  format: ({ dictionary }) => {
    const lines = dictionary.allTokens.map((token) => {
      const name = token.name.replace(/^dark-/, '');
      // {navy.900} → var(--navy-900). 값을 통째로 복사하면 2층 구조가 무의미해진다.
      const ref = String(token.original.$value ?? token.original.value ?? '');
      const value = ref.startsWith('{')
        ? `var(--${ref.slice(1, -1).replace(/\./g, '-')})`
        : token.$value ?? token.value;
      const desc = token.$description ? ` /** ${token.$description} */` : '';
      return `    --${name}: ${value};${desc}`;
    });
    return [
      '/**',
      ' * Do not edit directly, this file was auto-generated.',
      ' *',
      ' * 다크 모드 — OS 설정(prefers-color-scheme)을 따른다. 앱 안에 토글은 없다.',
      ' * 여기 없는 토큰은 라이트 값을 그대로 쓴다. 다른 semantic 을 참조하는',
      ' * 파생 토큰(foreground·border·muted-foreground 등)은 참조 대상만 바뀌면',
      ' * 자동으로 따라오므로 재정의하지 않는다.',
      ' */',
      '',
      '@media (prefers-color-scheme: dark) {',
      '  :root {',
      ...lines,
      '  }',
      '}',
      '',
    ].join('\n');
  },
});

const sd = new StyleDictionary({
  source: ['tokens/*.json'],
  platforms: {
    css: {
      // transformGroup 'css' 를 쓰지 않는 이유:
      // 거기 포함된 size/rem 이 "28px" 를 "1.75rem" 으로 바꿔버려
      // --font-h1-desktop 의 값이 원본과 달라진다. 필요한 것만 골라 쓴다.
      transforms: ['attribute/cti', 'name/kebab', 'color/css'],
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          // dark 는 별도 파일로 나가므로 여기서 뺀다 — 안 빼면 --dark-background
          // 같은 쓰이지 않는 변수가 :root 에 섞인다.
          filter: (token) =>
            !FIGMA_ONLY.includes(token.path[0]) && token.path[0] !== 'dark',
          // semantic 이 원색을 var(--blue-600) 로 참조하게 만든다.
          // 이게 꺼지면 값이 통째로 복사돼 2층 구조가 무의미해진다.
          options: { outputReferences: true },
        },
        {
          destination: 'tokens-dark.css',
          format: 'css/variables-dark-media',
          filter: (token) => token.path[0] === 'dark',
        },
      ],
    },
  },
});

await sd.buildAllPlatforms();
