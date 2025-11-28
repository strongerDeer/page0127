# @repo/design-tokens

디자인 토큰 패키지 - Figma Tokens Studio 연동

## 📦 사용 방법

### 1. JavaScript/TypeScript에서 사용

```typescript
// Light 테마
import tokens from '@repo/design-tokens/light';

console.log(tokens.color.text.primary); // #111827

// Dark 테마
import darkTokens from '@repo/design-tokens/dark';

console.log(darkTokens.color.text.primary); // #f9fafb
```

### 2. CSS에서 사용

```css
/* Light 테마 */
@import '@repo/design-tokens/css/light';

/* Dark 테마 */
@import '@repo/design-tokens/css/dark';

/* 사용 예시 */
.button {
  background-color: var(--color-action-primary-default);
  color: var(--color-text-inverse);
}
```

## 🎨 토큰 구조

- `tokens/core.json` - 기본 색상 팔레트, 간격, 폰트 등
- `tokens/light.json` - Light 테마 시맨틱 토큰
- `tokens/dark.json` - Dark 테마 시맨틱 토큰

## 🔄 Figma 토큰 업데이트

1. Figma에서 Tokens Studio 플러그인 사용
2. JSON 파일 export
3. `tokens/` 디렉토리에 파일 교체
4. 빌드 실행

```bash
npm run build
```

## 📝 빌드 스크립트

- `npm run build` - 토큰 빌드 (CSS, JS, JSON 생성)
- `npm run clean` - 생성된 파일 삭제
- `npm run rebuild` - 클린 후 재빌드
