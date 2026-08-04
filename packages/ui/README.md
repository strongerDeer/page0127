# @repo/ui

page0127 디자인 시스템. **토큰 위에 올라가는 컴포넌트 계층**이다.

앱(`apps/page0127`)은 이 패키지의 소비자다. 앱의 `globals.css` 는
`@import "@repo/ui/styles.css"` 한 줄뿐이고, 색을 직접 적을 자리가 없다.

- 📚 **Storybook** — 컴포넌트 카탈로그와 Foundation 문서 (Chromatic 배포)
- 🎨 **Figma** — `page0127 Design System` (파일 `5ErSDsG1MNfvexSDZ2PfLS`)

---

## 3층 구조

값이 한 방향으로만 흐른다. 아래층은 위층을 모른다.

```
@repo/design-tokens      값의 단일 출처. Figma Variables 와 왕복한다
        ↓                primitives.json → semantic.json → dist/tokens.css
@repo/ui  styles/        그 값을 Tailwind 에 노출(@theme)하고,
                         토큰만으로 표현 못 하는 형태를 클래스로 만든다
        ↓                (.book-cover 같은 도메인 셰이프)
@repo/ui  components/    위 둘을 조합해 실제 UI 를 만든다
        ↓
apps/page0127            소비자. 시스템이 준 것만 쓴다
```

**색·간격·모서리 값을 바꾸려면** 이 패키지가 아니라
`packages/design-tokens/tokens/*.json` 을 고치고 빌드한다.

---

## 무엇이 시스템이고 무엇이 아닌가

`src/index.ts` 에 없으면 시스템이 아니다. 경계는 "생김새"가 아니라
**무엇에 묶여 있는가**로 가른다.

| | 판단 | 예 |
| --- | --- | --- |
| 시스템 | 형태만 제공한다 | `Button` · `BookCover` · `ErrorFallback` |
| 앱 | 도메인 규칙·문구에 묶여 있다 | `RelativeTime`(KST·한국어 시간 표현) |
| 앱 | 특정 실행 문맥에서만 동작한다 | `SubmitButton`(서버 액션 폼 전용) |

애매할 때의 물음: **"이것과 똑같이 생긴 것이 다른 화면에도 나타날까?"**

형태 없는 클릭 영역에는 `Button` 을 쓰지 않는다 — variant 를 전부 무력화해야
한다면 그건 컴포넌트를 쓰는 게 아니라 이기는 것이다.

---

## 규칙

### 크기 이름은 sm / md / lg 다

시스템 전체가 같은 축을 쓴다. shadcn 원본의 `default` 는 "무엇의 기본인가"를
말할 뿐 크기를 말하지 않아 `md` 로 바꿨다. 기본값이라는 사실은
`defaultVariants` 가 표현한다.

아이콘 버튼은 `icon-sm` · `icon-md` · `icon-lg`.
BookCover 만 다섯 계단(`xs`~`xl`)에 `full` · `fill` 이 더 있다.

### 색은 검산된 짝으로만 쓴다

`bg-primary/15` 처럼 **임의 투명도를 얹지 않는다.** 반투명 색은 깔린 배경에
따라 실제 값이 달라져서 토큰 표 어디에도 그 명암비가 없다. 실제로 그렇게 만든
배지가 4.31:1 로 AA 미달인 채 오래 쓰이고 있었다.

짝이 필요하면 시스템이 라이트·다크 양쪽에서 검산해 둔 것을 쓴다 —
`bg-accent` + `text-accent-foreground`, `bg-card` + `text-card-foreground`.

### shadcn 원본은 고치지 않는다

파일명이 경계다.

- `kebab-case.tsx` — shadcn CLI 산출물. **ESLint 검사 제외.** 규칙에 맞추려
  손대면 다음 업스트림 갱신 때마다 그 수정을 다시 해야 한다.
- `PascalCase.tsx` — 우리가 만든 것. 검사한다.
- `*.stories.tsx` — 누구 컴포넌트든 문서는 우리가 쓴 것이므로 검사한다.

---

## 회귀는 무엇이 막는가

깨지는 방식마다 다른 장치가 맡는다. **셋 다 CI 에서 돈다.**

| 무엇이 깨지나 | 무엇이 막나 |
| --- | --- |
| 접근성 — 명암비·aria 누락 | `test:storybook` (axe, 스토리 100개) |
| **눈으로 봐야 아는 변화** — padding·그림자 | Chromatic 시각 회귀 |
| 토큰 이름이 사라짐 | `tests/token-usage.test.ts` |
| `@theme` 배선이 끊김 | `tests/theme-mapping.test.ts` |
| 명암비 계산이 틀림 | `tests/contrast.test.ts` |

> **자동 검사는 바닥이지 천장이 아니다.** axe 는 "명백한 위반"만 잡는다 —
> `<div>` 로 만든 제목, 아무 말 없는 로딩 상태는 여전히 사람이 봐야 한다.
> 실제로 그렇게 잡은 결함이 셋 있었다(카드·스켈레톤의 접근성 0점,
> `progress` 의 `aria-valuenow` 누락, `ErrorFallback` 의 `role` 부재).

---

## 조용히 깨지는 함정

전부 실제로 밟았고, 에러 없이 화면만 달라지는 종류다.

**`@layer` 밖의 클래스는 Tailwind 유틸을 이긴다.**
`.book-cover` 가 레이어 밖에 있던 동안 대체 표지의 `bg-sunken` 이 한 번도
적용된 적이 없었다. `.heading-*` 도 같은 함정을 겪었다.
도메인 셰이프 클래스는 반드시 `@layer components` 안에 둔다.

**`aspect-ratio` 는 콘텐츠 최소 너비에 밀린다.**
비율만 주면 작은 크기에서 글자가 상자를 옆으로 민다(실측: 52.2×64 → 비율 1.23).
너비를 함께 못 박아야 한다.

**워크스페이스 패키지는 `node_modules` 심링크로도 보인다.**
Storybook 의 `reactDocgen` propFilter 와 Tailwind 자동 탐지가 둘 다
`node_modules` 를 건너뛴다. 각각 `@repo/` 예외와 `@source` 가 필요하다.

**스토리에만 쓰인 임의값 클래스는 생성되지 않는다.**
`h-[80px]` 가 74×33px 로 나왔다. `.storybook/preview.css` 의 `@source` 참고.

**`cn()` 은 나중에 온 것을 남긴다.**
호출부 `className` 을 앞에 두면 뒤따르는 기본 클래스에 진다. 항상 맨 뒤에.

---

## 명령

| 명령 | 하는 일 |
| --- | --- |
| `npm run lint` | shadcn 원본을 뺀 나머지 검사 |
| `npm run test` | 토큰 계약·명암비·판정 함수 |
| `npm run type-check` | |
| `npm run storybook -w page0127` | 카탈로그 (6006) |
| `npm run test:storybook -w page0127` | 스토리를 Chromium 에서 렌더 + axe |

Storybook 설정이 앱에 있는 이유: `@storybook/nextjs-vite` 가 `next/image` 를
대체해 주는데, 그 배선이 앱의 Next 설정에 붙어 있다. 스토리 파일 자체는
컴포넌트 옆(이 패키지)에 산다.
