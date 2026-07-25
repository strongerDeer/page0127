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
| `npm run test` | 이사 전 기준선과 대조 (회귀 방지) |
| `npm run baseline` | 기준선 재생성 — **평소에 쓰지 않는다** (아래) |

> ⚠️ `npm run baseline` 은 `tests/baseline.json` 을 현재 `globals.css` 기준으로 덮어쓴다.
> 이 스냅샷은 "토큰 이사 이전 상태"를 붙잡아 둔 것이라, 다시 돌리면 회귀 감지 능력이 사라진다.
> 의도적으로 기준을 갱신할 때만 쓴다.
