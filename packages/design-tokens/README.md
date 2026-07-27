# @repo/design-tokens

page0127 디자인 토큰. **Figma Variables 와 왕복하는 단일 출처.**

## 구조

```
tokens/primitives.json   원색 팔레트 (blue/navy/gray/…, space, corner)
tokens/semantic.json     직무 토큰 (text/strong, primary, line, …)
        ↓ npm run build
dist/tokens.css          globals.css 가 import 하는 생성물
```

- **primitive**는 화면에 직접 쓰지 않는다. semantic 이 참조할 원색일 뿐이다.
- **semantic**만 컴포넌트에서 쓴다. 이름이 곧 용도다.
- `space`·`corner`는 **Figma 전용**이라 CSS 로 나가지 않는다. 코드에서 간격·모서리는 Tailwind 기본 스케일을 쓴다.

## 값을 바꾸려면

1. Figma 에서 Variables 수정
2. Tokens Studio 플러그인에서 JSON export → `tokens/` 에 덮어쓰기
3. `npm run build`
4. `npm run test` 로 회귀 확인

## 명령

| 명령 | 하는 일 |
| --- | --- |
| `npm run build` | `dist/tokens.css` 생성 |
| `npm run test` | 생성물이 2층 구조 계약을 지키는지 검사 |

## 회귀는 무엇이 막는가

토큰이 깨지는 방식이 세 가지라, 각각 다른 장치가 맡는다.

| 무엇이 깨지나 | 무엇이 막나 |
| --- | --- |
| **값이 실수로 바뀜** | `dist/tokens.css` 를 커밋하므로 **git diff** 에 그대로 드러난다 |
| **이름이 사라짐** — 쓰는 쪽이 조용히 죽는다 | `apps/page0127/app/token-usage.test.ts` — 소스가 쓰는 `var(--…)` 를 전부 모아 정의 존재를 확인 |
| **구조가 무너짐** — semantic 이 원색을 참조하지 않고 값을 복사 | `tests/tokens.test.ts` (이 패키지) |

여기에 `apps/page0127/app/globals.test.ts` 가 하나 더 있다 — `@theme inline` 이 semantic 색을 빠짐없이 `--color-*` 로 노출하는지 본다. 토큰이 살아 있어도 그 배선이 끊기면 `bg-rank-up` 같은 클래스가 조용히 죽기 때문이다.

> **값 대조 스냅샷(`baseline.json`)은 없앴다.** 이사 직후에는 "이사 전 값과 같은가"로 회귀를 막았지만,
> 그 방식은 값이 **정당하게** 바뀌는 순간부터 방해가 된다 — 다크모드나 브랜드 색 조정이 오면 실패하는데
> 버그인지 의도인지 구분할 수 없다. 값 변경 감시는 커밋된 `dist/tokens.css` 의 diff 가 더 잘한다.

## `dist/tokens.css`를 커밋하는 이유

`dist/`는 빌드 생성물이지만 이 저장소에서는 예외적으로 **git에 커밋한다.** CI의 일부 경로(`packages/quality`의 `next build` 직접 호출, `.github/workflows/quality.yml`)가
turbo 그래프를 거치지 않고 `apps/page0127`을 곧바로 빌드하기 때문에, `dist/tokens.css`가 turbo 빌드 순서에 의존해 매번 새로 생성된다는 보장이 없다. 커밋된 생성물을 두면
그런 경로에서도 `@import "@repo/design-tokens/tokens.css"`가 항상 해석된다. 값을 바꿀 때는 `tokens/*.json`을 고친 뒤 `npm run build`로 재생성하고, **생성물도 함께 커밋**해야 한다.
