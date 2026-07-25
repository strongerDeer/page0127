import StyleDictionary from 'style-dictionary';

/**
 * Figma 전용 토큰 — CSS 로는 내보내지 않는다.
 * 코드에서 간격·모서리는 Tailwind 기본 스케일을 쓰므로 CSS 변수가 필요 없다.
 * 이 값들은 Figma 에서 디자인할 때 임의값이 나오지 않게 막는 용도로만 존재한다.
 */
const FIGMA_ONLY = ['space', 'corner'];

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
          filter: (token) => !FIGMA_ONLY.includes(token.path[0]),
          // semantic 이 원색을 var(--blue-600) 로 참조하게 만든다.
          // 이게 꺼지면 값이 통째로 복사돼 2층 구조가 무의미해진다.
          options: { outputReferences: true },
        },
      ],
    },
  },
});

await sd.buildAllPlatforms();
