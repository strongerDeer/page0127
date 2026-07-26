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
| `npm run test` | 기준선(`tests/baseline.json`)과 대조 (회귀 방지) |
| `npm run update-baseline` | 기준선을 **현재 승인된 값**으로 갱신 — **평소에 쓰지 않는다** (아래) |

> ⚠️ `npm run update-baseline` 은 `tests/baseline.json` 을 `dist/tokens.css`(빌드 결과) 기준으로 덮어쓴다.
> 이 스냅샷이 곧 회귀 테스트의 "정답"이므로, **값이 의도적으로 바뀐 커밋에서만** 돌린다.
> 실행 전 `npm run build`로 `dist/tokens.css`를 최신 상태로 만들어야 하고, 실행 후 `tests/baseline.json`의
> `git diff`가 리뷰 대상이 된다 — 의도한 토큰만 바뀌었는지 diff로 반드시 확인한다.
> 값을 바꾸지 않았는데 그냥 돌리면 회귀 감지 능력이 사라지므로 하지 않는다.

## `dist/tokens.css`를 커밋하는 이유

`dist/`는 빌드 생성물이지만 이 저장소에서는 예외적으로 **git에 커밋한다.** CI의 일부 경로(`packages/quality`의 `next build` 직접 호출, `.github/workflows/quality.yml`)가
turbo 그래프를 거치지 않고 `apps/page0127`을 곧바로 빌드하기 때문에, `dist/tokens.css`가 turbo 빌드 순서에 의존해 매번 새로 생성된다는 보장이 없다. 커밋된 생성물을 두면
그런 경로에서도 `@import "@repo/design-tokens/tokens.css"`가 항상 해석된다. 값을 바꿀 때는 `tokens/*.json`을 고친 뒤 `npm run build`로 재생성하고, **생성물도 함께 커밋**해야 한다.
