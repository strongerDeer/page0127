# 디자인 시스템 라운드 1 — Foundations 설계

- 작성일: 2026-07-26
- 범위: 디자인 토큰(컬러·타이포·스페이싱·radius)의 Figma ↔ 코드 왕복 구조 확립
- Figma 파일: `page0127` (`5ErSDsG1MNfvexSDZ2PfLS`)

---

## 0. 한 줄 요약

이미 코드에서 운용 중인 디자인 토큰을 **primitive / semantic 2층으로 정리해 Figma Variables로 옮기고**, Style Dictionary 파이프라인으로 다시 코드로 내려오는 왕복 경로를 만든다. **컴포넌트 코드는 한 줄도 고치지 않는다.**

---

## 1. 배경

### 1.1 출발점의 오해를 먼저 정정한다

요청은 "Figma 토큰부터 만들고 싶다"였으나, 실측 결과 **코드가 Figma보다 훨씬 앞서 있다.**

| | 상태 |
|---|---|
| Figma 파일 | `Page 1` 하나, **노드 0개** (완전히 빈 파일) |
| `apps/page0127/app/globals.css` | 브랜드 팔레트·원칙·타이포가 **주석까지 붙어 구현 완료** |
| 근거 문서 | `00_docs/07_리디자인_진단_및_실행안.md` — 교보문고·밀리의서재 computed style 실측 기반 |
| `packages/design-tokens` | **죽은 패키지** (아래 1.3) |

따라서 Figma에서 토큰을 새로 설계하는 것은 **이미 근거를 갖고 확정한 값을 다시 만드는 일**이 된다. 방향을 뒤집어, 코드를 Figma로 1회 이사시킨 뒤 그 시점부터 Figma를 원본으로 삼는다.

### 1.2 실제로 빠져 있는 것 — primitive 레이어

`globals.css`의 semantic 레이어는 이미 좋다. `--text-strong`, `--line`, `--sunken`처럼 "무엇에 쓰는 색인지"로 이름이 붙어 있다. 문제는 그 아래다.

```css
--primary: #1e69cb;   /* 원색이 직무 토큰에 직접 박혀 있다 */
--rank-up: #d9480f;
--line: #dfe3e8;
```

07 문서가 확정한 브랜드 램프 5색 `#0455BF · #1E69CB · #2D78DB · #438EF2 · #74B0FF` 중 코드에는 3개만 흩어져 있고, `#2D78DB`·`#438EF2`는 **어디에도 없다.** "이 파랑을 한 단계 밝게"라는 요청이 오면 어디를 고쳐야 하는지가 불명확하다.

### 1.3 `packages/design-tokens`는 폐기하고 새로 쓴다

기존 패키지를 되살리지 않는 이유:

- `style-dictionary ^3.9.2` — CommonJS 기반 구버전. 현재 최신은 v5(ESM)이고 설정 API가 다르다. **의존성이 설치조차 되어 있지 않다.**
- `tokens/core.json`의 팔레트가 **인디고 계열** — 07 문서가 "인디고를 버린다"며 폐기한 바로 그 색이다.
- `next.config.ts:37`에 사망 진단이 이미 적혀 있다: *"`@repo/design-tokens`는 어디서도 import 되지 않아 제거했다. 디자인 토큰의 단일 출처는 `app/globals.css`다."*

디렉토리 구조와 `@repo/design-tokens`라는 이름만 계승하고 내용물은 전부 새로 작성한다.

---

## 2. 확정된 결정

| # | 결정 | 근거 |
|---|---|---|
| 1 | **코드 → Figma 1회 이사, 이후 Figma가 원본** | 07 문서의 실측 근거를 보존하면서 디자인 워크플로를 연다 |
| 2 | **다크모드는 구조만 열어두고 값은 나중에** | 2층 구조를 갖추면 나중에 semantic 값만 갈아끼우면 된다. 지금 비용 거의 없음 |
| 3 | ~~**파이프라인: Tokens Studio 왕복**~~ → **MCP `use_figma` 직접 실행** | 설계 시점 판단이 구현 중 뒤집혔다 (아래 2.1) |
| 4 | **`gray/50`·`gray/100` 통합** | 밝기 차 L\* 약 2로 육안 구분 불가 (§4.3) |
| 5 | **타이포는 6단이 아니라 5단** | 07의 `caption 13px`는 실사용 0곳 (§5.2) |

### 2.1 파이프라인 — 설계 시점 판단과 그 정정

Figma 계정은 **Pro 플랜 / Full seat** (`dreamfulbud@gmail.com`, 팀 `Dreamfulbud`).

**설계 시점의 제약 분석** (이 부분은 여전히 맞다):

- Figma **Variables REST API는 Enterprise 전용**이다. Pro에서는 REST로 Variables를 읽거나 쓸 수 없다.
- MCP `get_variable_defs`는 *노드에 바인딩된* 변수만 반환하므로 토큰 전체를 덤프하는 용도로는 부적합하다.

여기서 "그러니 Plugin API를 쓰는 Tokens Studio 플러그인이 유일한 우회로"라고 결론지었는데, **이것이 틀렸다.**

> **정정 (구현 중, 2026-07-27):** MCP `use_figma` 자체가 **Figma Plugin API에 JavaScript를 직접 실행**한다. 즉 Tokens Studio가 제공하던 우회로를 MCP가 이미 갖고 있었다. 플러그인 설치·임포트·수동 동기화 없이 Variables 78개와 Text Style 7개를 스크립트로 생성했고, 값 검증까지 같은 경로로 했다.
>
> **교훈**: "REST API가 막혔다"와 "프로그래매틱 접근이 막혔다"는 다른 명제다. 도구의 실제 실행 방식(무엇을 통해 파일에 접근하는가)을 확인하기 전에 우회로부터 설계했다.

MCP 사용량 한도는 Pro/Full 기준 **200 calls/day, 15/min** — 이 작업 전체에 충분했다.

**Tokens Studio가 여전히 필요한 경우**: 디자이너가 Figma UI에서 토큰을 편집하고 그것을 JSON으로 내보내야 할 때. 지금처럼 코드가 원본이고 에이전트가 동기화하는 구조에서는 필요 없다.

---

## 3. 범위

### 3.1 이번 라운드에 하는 것

- primitive / semantic 2층 토큰 구조 확립
- Figma Variables 2개 컬렉션 + Text Styles 7개 생성
- `packages/design-tokens` 재작성 (Style Dictionary v5)
- `globals.css`가 생성된 `tokens.css`를 참조하도록 배선
- 이름 대조 회귀 테스트

### 3.2 이번 라운드에 하지 않는 것

| 제외 | 이유 |
|---|---|
| 컴포넌트 코드 수정 | §4.2의 이름 계승 원칙으로 **0줄 수정**이 목표 |
| Figma 컴포넌트 제작 | 라운드 2 |
| Code Connect 매핑 | 라운드 2 |
| 다크모드 값 | 라운드 4 |
| Layer 3 (component 토큰) | 쓰는 곳이 생기는 라운드 2까지 만들지 않는다 |
| `text-xl`·`text-2xl`·`text-3xl` 정리 (8곳) | 스케일 밖 크기지만 컴포넌트 수정이 필요 → 라운드 2 |
| `.book-cover` 비대칭 radius | Figma Variables가 비대칭 radius를 담지 못함 → 라운드 3에서 컴포넌트로 |

### 3.3 전체 로드맵에서의 위치

| 라운드 | 범위 | 상태 |
|---|---|---|
| **1. Foundations** | 컬러·타이포·스페이싱·radius 토큰 | ✅ **완료 (2026-07-27)** — 코드 `a604390` + Figma Variables 78 / Text Style 7 |
| 2. Primitives | shadcn 계열 27개 컴포넌트 + variants + Code Connect | 예정 |
| 3. 도메인 컴포넌트 | BookCover, BookCard, 활동 타임라인 등 | 예정 |
| 4. 다크모드 | Semantic 컬렉션에 Dark 모드 값 추가 | 예정 |

UI 컴포넌트는 현재 총 **135개**다. 한 번에 다루지 않고 위 순서로 쪼갠다.

---

## 4. 설계 §1 — 토큰 레이어 구조

### 4.1 2층 구조

```
Layer 1 · Primitive  ─ blue/600, navy/900, gray/300 …
        │              "원색 팔레트". 화면에 직접 쓰지 않는다.
        ↓ 참조(alias)
Layer 2 · Semantic   ─ text/strong, line/default, action/primary …
                       "직무". 컴포넌트는 이것만 쓴다.
```

Layer 3(`button/primary/bg` 같은 component 토큰)은 만들지 않는다. 필요해지는 시점은 라운드 2이며, 미리 만들면 쓰이지 않는 토큰만 늘어난다.

### 4.2 가장 중요한 제약 — semantic 이름을 그대로 계승한다

```css
/* 새로 생기는 것 */
--blue-600: #1e69cb;

/* 기존 이름 유지, 값만 primitive를 참조 */
--primary: var(--blue-600);
--text-strong: var(--navy-900);
```

**이 원칙이 "컴포넌트 135개 0줄 수정"을 보장한다.** 토큰 정비가 UI 회귀 위험 없이 끝나고, 라운드 2의 컴포넌트 작업과 깨끗하게 분리된다.

### 4.3 네이밍

| 위치 | 표기 | 예 |
|---|---|---|
| Figma Variables | `그룹/이름` (슬래시가 폴더가 됨) | `blue/600`, `text/strong` |
| CSS 변수 | `--그룹-이름` | `--blue-600`, `--text-strong` |

Figma에서 원색은 **색 피커에 뜨지 않게** 한다. 디자이너가 색을 고를 때 원색 램프가 아니라 직무 토큰만 보이게 해서, 규칙 위반을 애초에 어렵게 만드는 장치다.

> **정정 (구현 중):** 설계 시점에는 이것을 "`Primitives` 컬렉션을 숨김 처리한다"고 적었으나, Figma의 *hide from publishing*은 **라이브러리 게시** 제어라 피커 노출과는 다른 개념이다. 의도를 실제로 달성하는 것은 `variable.scopes`다. 그래서 **원색 20개는 `scopes = []`** 로 두어 어떤 피커에도 나타나지 않게 했고, 반대로 `space`·`corner`는 Figma에서 쓰라고 만든 것이므로 각각 `["GAP","WIDTH_HEIGHT"]`·`["CORNER_RADIUS"]`로 해당 피커에만 노출시켰다. 컬렉션 자체는 게시 숨김 처리하지 않았다 — 그렇게 하면 `space`·`corner`까지 함께 사라진다.

---

## 5. 설계 §2 — 컬러

### 5.1 Primitive 램프 (20색)

**blue — 브랜드.** 07이 확정한 5색을 밝기순으로 배정하고, 코드에서 쓰던 틴트를 `blue/50`으로 편입했다.

| 토큰 | 값 | 현재 용도 |
|---|---|---|
| `blue/50` | `#E3EEFC` | `--accent` (활성 메뉴 배경) |
| `blue/300` | `#74B0FF` | `--chart-3` |
| `blue/400` | `#438EF2` | *미사용 — 램프를 메우는 칸* |
| `blue/500` | `#2D78DB` | *미사용 — 램프를 메우는 칸* |
| `blue/600` | `#1E69CB` | **`--primary`** (주 CTA·링크·`--ring`) |
| `blue/700` | `#0455BF` | `--accent-foreground` |

`blue/400`·`blue/500`은 07에서 확정했으나 코드에 없던 두 칸이다. 채워두면 hover·press 단계나 차트 계열 확장에 쓸 자리가 생긴다.

**navy — 텍스트 잉크.** 순검정 대신 쓰는 네이비. 밝기 간격이 L\* 약 17씩 균등해 번호가 깔끔하게 떨어진다.

| 토큰 | 값 | 현재 용도 |
|---|---|---|
| `navy/300` | `#97A4C0` | `--text-faint` (캡션) |
| `navy/500` | `#66779A` | `--text-subtle` (저자·메타) |
| `navy/700` | `#3B4E70` | `--text-body` (본문) |
| `navy/900` | `#14294E` | `--text-strong` (제목) |

**gray — 면과 선.** 07 원칙 2번("입체는 그림자가 아니라 1px 선")이 걸린 곳이라 선 색 2단계가 중요하다.

| 토큰 | 값 | 현재 용도 |
|---|---|---|
| `gray/0` | `#FFFFFF` | `--background` · `--card` · `--popover` · `--sidebar` |
| `gray/50` | `#F6F7F8` | `--sunken` · **`--secondary`** · **`--muted`** ← 통합 |
| `gray/200` | `#ECEFF2` | `--line-soft` |
| `gray/300` | `#DFE3E8` | `--line` (→ `--border`, `--input`) |

**직무색·차트색.** 쓰는 자리가 하나씩이라 램프를 만들지 않는다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `orange/600` | `#D9480F` | `--rank-up` (순위 상승·포인트 전용) |
| `red/600` | `#C0392B` | `--destructive` (삭제·탈퇴 전용) |
| `amber/500` | `#D9A520` | `--chart-4` |
| `slate/500` | `#5B6B8C` | `--chart-5` |
| `teal/500` | `#14B8A6` | `--chart-6` |
| `violet/500` | `#7A5CF0` | `--chart-7` |

### 5.2 결정 4 — `gray/100` 통합 (값이 바뀌는 유일한 지점)

기존 `globals.css`에는 두 중립 면이 있었다.

- `--sunken: #F6F7F8`
- `--secondary` · `--muted`: `#F1F3F5`

두 색의 밝기 차이는 **L\* 약 2**로 화면에서 사실상 구분되지 않는다. 서로 다른 시점에 따로 추가되며 생긴 중복으로 판단해 **`#F6F7F8` 하나로 통합**한다.

> ⚠️ **이것이 이번 라운드에서 실제 색상 값이 바뀌는 유일한 지점이다.**
> `--secondary`와 `--muted`가 `#F1F3F5` → `#F6F7F8`로 이동한다. 육안 확인이 불가능한 수준이지만, 회귀 검증 시 이 두 토큰만은 "값이 달라진 것이 의도된 것"임을 기억할 것.

---

## 6. 설계 §3 — 타이포그래피 · 스페이싱 · radius

### 6.1 실측: 크기는 이미 맞다

| 클래스 | 사용 횟수 | 07 스케일 대응 |
|---|---:|---|
| `text-sm` (14px) | **236** | `sub` — 최다 |
| `text-xs` (12px) | 84 | `micro` |
| `text-base` (16px) | 27 | `body` |
| `heading-1` (28/24px) | 17 | `display` ✅ 크기 일치 |
| `heading-2` (20/18px) | 8 | `heading` ✅ 크기 일치 |
| `text-xl` / `2xl` / `3xl` | 8 | 스케일 **밖** → 라운드 2 정리 대상 |

크기 5종(28·20·16·14·12)은 07 문서와 코드가 이미 일치한다. 어긋나는 것은 **줄간격뿐**이다.

### 6.2 확정 스케일 — 크기 5단 / Text Style 7개

크기는 **5단**(28·20·16·14·12)이고, 그중 `display`·`heading` 둘은 모바일 변형이 있어 Figma **Text Style은 7개**가 된다.

| 토큰 | size / line-height | weight | 매핑 | 현재 계산값 | 변경 |
|---|---|---|---|---|---|
| `display` | 28 / **40** | 700 | `.heading-1` (데스크톱) | 28 / 37.8 | **37.8 → 40** |
| `display-mobile` | 24 / **34** | 700 | `.heading-1` (모바일) | 24 / 32.4 | **32.4 → 34** |
| `heading` | 20 / **30** | 700 | `.heading-2` (데스크톱) | 20 / 28 | **28 → 30** |
| `heading-mobile` | 18 / **27** | 700 | `.heading-2` (모바일) | 18 / 25.2 | **25.2 → 27** |
| `body` | 16 / 24 | 500 | `text-base` | 16 / 24 | — ✅ 이미 일치 |
| `sub` | 14 / **22** | 400 | `text-sm` | 14 / 20 | **20 → 22** |
| `micro` | 12 / **18** | 500 | `text-xs` | 12 / 16 | **16 → 18** |

**줄간격을 07 스펙에 맞춘다.** 한글 다행 텍스트의 가독성이 개선되고, 무엇보다 Figma Text Style과 코드가 어긋난 채 출발하지 않는다.

> 📌 **`display`·`heading`의 줄간격도 바뀐다.**
> `.heading-1`·`.heading-2`는 고정 px가 아니라 **비율**(`1.35`·`1.4`)로 줄간격을 주고 있어, 계산값이 07 스펙과 미묘하게 어긋나 있다. 07이 정의한 비율(display 40/28 ≈ 1.43, heading 30/20 = 1.5)을 모바일에도 적용해 `display-mobile 34`·`heading-mobile 27`을 도출했다 — 07에 모바일 정의가 없어 데스크톱 비율을 그대로 내린 값이다.

수정은 `globals.css`의 `@theme`과 `.heading-*` 유틸리티 몇 줄이며 **클래스 이름은 그대로라 컴포넌트 코드는 바뀌지 않는다.** 적용 범위는 **345곳**(`text-sm` 236 + `text-xs` 84 + `heading-1` 17 + `heading-2` 8)이므로 촘촘한 레이아웃에서 밀릴 여지가 있어 육안 검증 대상이다.

### 6.3 결정 5 — `caption 13px`를 만들지 않는다

07 문서는 6단(`caption 13/20` 포함)을 제안했으나 **13px는 현재 코드에서 쓰이는 곳이 0곳**이다. 12px와 14px 사이에 한 단을 더 끼우면 위계가 선명해지는 게 아니라 흐려지고, "이건 caption인가 micro인가"를 매번 고민하게 된다. 07은 설계 시점의 안이었고 실측 결과 불필요하다. **이것이 07 문서를 그대로 따르지 않는 유일한 지점이다.**

### 6.4 스페이싱

커스텀 스케일을 만들지 않는다. 현재 Tailwind 기본(4px 그리드)을 쓰고 있고 잘 작동한다. Figma에는 실제 쓰는 **8단만** Variables로 올려, 디자인 시 임의값이 나오지 않게 막는 용도로 쓴다.

```
4 · 8 · 12 · 16 · 24 · 32 · 48 · 64  (px)
```

### 6.5 radius

`globals.css`의 기존 파생값을 그대로 옮긴다. Figma Variables 4개: `sm 4` · `md 6` · `lg 8` · `xl 12` (px).

`.book-cover`의 `2px 6px 6px 2px`(왼쪽이 책등이라 각진 도메인 셰이프)는 **Figma Variables로 표현할 수 없다** — 변수는 비대칭 radius를 담지 못한다. 라운드 3에서 `BookCover` 컴포넌트 자체로 만들고, 이번 라운드에서는 문서에만 기록한다.

---

## 7. 설계 §4 — Figma 구조와 코드 파이프라인

### 7.1 Figma

기존 파일(`page0127`)을 쓴다. 페이지는 **`Foundations` 하나만** 만든다. `Components`는 라운드 2에서 필요해질 때 만든다.

**Variables 컬렉션 2개**

| 컬렉션 | 모드 | 내용 | 피커 노출 |
|---|---|---|---|
| `Primitives` | `Value` | 색 20 (`scopes = []`) + `space` 8 + `corner` 4 = **32개** | 색은 **숨김**, space/corner만 해당 피커에 |
| `Semantic` | `Light` | **46개**, 색 41개 전부 Primitives 참조 | 직무에 맞는 피커에만 |

**Text Styles 7개** — §6.2 표의 7개. 모바일 2개가 별도 스타일인 이유는 Figma Text Style이 브레이크포인트를 담지 못하기 때문이다. 코드에서 `.heading-1`이 미디어쿼리로 처리하는 것을 Figma에서는 두 스타일로 나눠 표현한다.

`Foundations` 페이지에는 램프·스케일을 눈으로 확인하는 스타일 가이드 프레임을 그린다.

> **실제 구현 결과 (2026-07-27):** 위 구조 그대로 생성했고, 계획에 없던 두 가지를 더했다.
>
> - **Code Syntax** — 각 변수에 `var(--primary)` 형태의 CSS 이름을 심었다. Figma에서 변수를 선택하면 코드 이름이 바로 보인다.
> - **살아있는 가이드** — 스타일 가이드의 스와치·간격 막대·모서리 상자를 전부 Variables에 바인딩했다(색은 fill, `space`는 `width`, `corner`는 네 모서리 radius). 토큰 값을 바꾸면 가이드가 자동으로 따라 움직인다.
>
> `Foundations` 페이지 구성: `1 · Colors` / `2 · Semantic` / `3 · Spacing & Corner` / `4 · Typography` 4프레임.

### 7.2 Semantic 46개 전체 매핑

`globals.css`의 `:root` 46개를 그대로 계승한다. 구현 시 이 표를 그대로 옮긴다.

**텍스트 (4 + 별칭 4)**

| 토큰 | 참조 |
|---|---|
| `--text-strong` | `navy/900` |
| `--text-body` | `navy/700` |
| `--text-subtle` | `navy/500` |
| `--text-faint` | `navy/300` |
| `--foreground` · `--card-foreground` · `--popover-foreground` | `var(--text-strong)` |
| `--muted-foreground` | `var(--text-subtle)` |

**표면 (7)**

| 토큰 | 참조 |
|---|---|
| `--background` · `--card` · `--popover` | `gray/0` |
| `--sunken` | `gray/50` |
| `--secondary` · `--muted` | `gray/50` ← **값 변경** (§5.2) |
| `--secondary-foreground` | `var(--text-strong)` |

**선 (4)**

| 토큰 | 참조 |
|---|---|
| `--line` | `gray/300` |
| `--line-soft` | `gray/200` |
| `--border` · `--input` | `var(--line)` |

**액션·상태 (7)**

| 토큰 | 참조 |
|---|---|
| `--primary` · `--ring` | `blue/600` |
| `--primary-foreground` | `gray/0` |
| `--accent` | `blue/50` |
| `--accent-foreground` | `blue/700` |
| `--rank-up` | `orange/600` |
| `--destructive` | `red/600` |

**차트 (7)**

| 토큰 | 참조 |
|---|---|
| `--chart-1` | `blue/600` |
| `--chart-2` | `orange/600` |
| `--chart-3` | `blue/300` |
| `--chart-4` | `amber/500` |
| `--chart-5` | `slate/500` |
| `--chart-6` | `teal/500` |
| `--chart-7` | `violet/500` |

**사이드바 (8)** — shadcn 호환용

| 토큰 | 참조 |
|---|---|
| `--sidebar` | `gray/0` |
| `--sidebar-foreground` | `var(--text-strong)` |
| `--sidebar-primary` · `--sidebar-ring` | `blue/600` |
| `--sidebar-primary-foreground` | `gray/0` |
| `--sidebar-accent` | `blue/50` |
| `--sidebar-accent-foreground` | `blue/700` |
| `--sidebar-border` | `var(--line)` |

**치수 (5)** — `--radius: 0.5rem`, `--font-h1-desktop: 28px`, `--font-h1-mobile: 24px`, `--font-h2-desktop: 20px`, `--font-h2-mobile: 18px`

### 7.3 코드 구조

```
packages/design-tokens/
├── package.json          style-dictionary ^5 (ESM) — 기존 v3 설정은 폐기
├── tokens/
│   ├── primitives.json   ← 토큰의 단일 출처 (Figma 는 여기서 생성된다)
│   └── semantic.json
├── build.mjs
└── dist/tokens.css       생성물이지만 커밋한다 (아래 근거)
```

> **왜 생성물을 커밋하는가 (구현 중 정정):** `packages/quality`가 turbo를 거치지 않고
> `apps/page0127`에서 `next build`를 직접 호출하는 경로(`.github/workflows/quality.yml`)가 있어,
> `dist/tokens.css`가 항상 turbo 빌드 순서대로 먼저 생성된다는 보장이 없다. gitignore한 채로 두면
> 그 경로에서 `@import "@repo/design-tokens/tokens.css"`가 ENOENT로 실패한다. 커밋해 두면
> 어떤 진입 경로든 파일이 항상 존재한다. 대신 값을 바꿀 때는 `npm run build` 결과를 함께 커밋해야 한다.

`globals.css`의 변화:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "@repo/design-tokens/tokens.css";   /* ← :root 블록이 이걸로 대체 */

@theme inline { … }   /* 그대로 유지 */
```

**경계 규칙**: 패키지는 토큰의 **값**을 갖고, `globals.css`의 `@theme`은 그 값을 **Tailwind에 어떻게 노출할지**를 갖는다. 후자는 앱의 관심사이므로 패키지로 내리지 않는다 — 다른 앱이 생기면 노출 방식이 달라질 수 있다.

**배선 3곳**
1. `apps/page0127/package.json` — `"@repo/design-tokens": "*"` 추가
2. `apps/page0127/next.config.ts` — `transpilePackages`에 추가
3. `turbo.json` — 앱 빌드가 토큰 빌드에 의존하도록 순서 지정

### 7.4 왕복 절차

| | 방향 | 하는 일 | 상태 |
|---|---|---|---|
| 1 | 코드 → JSON | `globals.css` 46개를 primitive/semantic으로 갈라 JSON에 기록 | ✅ 완료 |
| 2 | JSON → Figma | **MCP `use_figma` 스크립트**로 Variables 생성 (Tokens Studio 불필요) | ✅ 완료 |
| 3 | Figma → 코드 | 값이 Figma 에서 바뀌면 `tokens/*.json` 수정 → `npm run build` → `tokens.css` | 이후 계속 |

3단계는 아직 실전 검증이 없다 — 이번 라운드에서 값이 Figma 쪽에서 먼저 바뀐 적이 없기 때문이다. 라운드 2에서 처음 겪게 되며, 그때 §11의 `baseline.json` 역할 결정이 함께 필요해진다.

---

## 8. 검증 계획

### 8.1 이름 대조 테스트 (필수)

생성된 `tokens.css`의 CSS 변수 이름 집합이 **기존 `globals.css`의 46개와 완전히 일치**하는지 검사하는 vitest 테스트를 만든다.

§4.2에서 "컴포넌트 135개 0줄 수정"을 약속했고, 그 약속은 **semantic 이름이 하나도 빠지지 않아야만** 성립한다. `--line-soft` 하나를 옮기다 흘리면 그것을 쓰던 화면의 구분선이 소리 없이 사라진다. 눈으로 잡기 어려운 종류의 회귀이므로 테스트로 막는다.

기존 하네스에 맞춰 `.test.ts`로 작성하고 `npm run test`에 포함시킨다.

### 8.2 값 대조

46개 토큰의 **최종 계산값**이 이사 전후로 동일한지 확인한다. 단, §5.2에서 의도적으로 바꾼 `--secondary`·`--muted` 2개는 예외로 처리하고 그 사실을 테스트에 명시한다.

### 8.3 육안 검증

주요 화면 4개를 이사 전후로 비교한다: **홈 · 내 서재 · 책 상세 · 대시보드**. §6.2의 줄간격 변경(345곳)이 촘촘한 레이아웃을 밀어내지 않았는지가 주 확인 대상이며, 특히 제목이 두 줄로 넘어가는 카드(긴 책 제목)를 중점적으로 본다.

---

## 9. 불확실성과 그 결말

설계 시점의 미결 사항은 **"Tokens Studio 무료 플랜에서 Variables 생성이 되는가"** 였고, 안 될 경우 MCP → 수동 순으로 우회하기로 했다.

**결말 (2026-07-27): 질문 자체가 필요 없었다.** 표의 2순위였던 MCP 경로가 곧바로 동작해 Tokens Studio를 설치조차 하지 않았다. §2.1의 정정을 참고할 것.

### 9.1 대신 실제로 발목을 잡은 것 — 폰트

예상하지 못한 제약이 하나 나왔다. **MCP가 실행되는 Figma 컨텍스트에는 로컬 폰트가 없다.**

- `~/Library/Fonts`에 Pretendard 9종이 2023년부터 설치돼 있고 macOS도 정상 인식한다
- 그런데 `figma.listAvailableFontsAsync()`가 반환한 8,934개 폰트에 Pretendard가 없다
- `loadFontAsync({family:'Pretendard'})`는 `font family does not exist`로 실패한다

그래서 Text Style 7개를 **Noto Sans KR로 만들고 사용자가 Figma UI에서 폰트만 교체**했다. 크기·줄간격·weight는 에이전트가 확정값으로 넣었으므로 교체는 드롭다운 7번이었다.

**이 제약의 파급 (라운드 2·3에서 중요):**

폰트가 Pretendard로 바뀐 뒤로는 **에이전트가 그 텍스트 노드의 `characters`를 수정할 수 없다.** Figma Plugin API는 텍스트를 바꾸기 전에 현재 폰트 로드를 요구하는데, 그 폰트가 MCP 컨텍스트에 없기 때문이다. 실제로 이번에도 안내 문구를 수정하려다 실패해 노드를 삭제하는 것으로 우회했다.

| 라운드 2·3에서 가능한 것 | 불가능한 것 |
|---|---|
| 노드 생성·삭제, 이동, 리사이즈 | Pretendard 텍스트의 `characters` 수정 |
| 색·간격·radius 변경, 변수 바인딩 | Pretendard 텍스트의 폰트·크기 변경 |
| 컴포넌트/variant 구성, 스타일 적용 | — |

**대응**: 컴포넌트의 텍스트 내용은 (a) 생성 시점에 확정하거나, (b) Noto로 만들고 사용자가 일괄 교체하거나, (c) 텍스트 수정이 필요한 작업은 사용자에게 넘긴다. 라운드 2 계획을 세울 때 이 제약을 전제로 태스크를 나눌 것.

---

## 10. 참고

- `00_docs/07_리디자인_진단_및_실행안.md` — 컬러·타이포·셰이프 원칙의 근거 (실측 기반)
- `apps/page0127/app/globals.css` — 이사 대상 원본
- `apps/page0127/next.config.ts:37` — 기존 패키지 폐기 경위

---

## 11. 알려진 이중 인코딩 지점 (최종 리뷰에서 확인, 2026-07-26)

색·텍스트 토큰은 §4.2 원칙대로 "패키지가 값을 갖고 앱은 노출 방식만 갖는" 구조가 깨끗이 성립한다.
하지만 radius 와 타이포 일부는 **같은 값이 패키지와 앱 두 곳에 따로 인코딩**돼 있다. 한쪽만 바뀌어도
지금 있는 테스트는 전혀 반응하지 않는다 — Figma에서 값을 바꿔 내려도 앱이 조용히 어긋날 수 있는 지점이다.

| 값 | 패키지 | 앱 | 위험 |
|---|---|---|---|
| radius 4/6/8/12 | `primitives.json`의 `corner/sm~xl` (Figma 전용, CSS 출력에서 제외됨) | `globals.css`의 `calc(var(--radius) ± Npx)` | `corner/sm~xl`을 Figma에서 바꿔도 앱의 `calc()` 파생값은 그대로다 — 둘이 애초에 연결돼 있지 않다 |
| 타이포 줄간격 | 없음 (semantic.json에 line-height 토큰 없음) | `globals.css`의 `--text-*--line-height`와 `.heading-*` 유틸리티의 하드코딩 px | Figma Text Style의 줄간격을 바꿔도 코드에 반영할 자동 경로가 없다. 코드를 손으로 맞춰야 한다 |
| 타이포 weight | 없음 | 없음 — `.heading-*`의 `font-weight: 700`만 하드코딩, `text-sm`/`text-xs`/`text-base`는 weight 토큰 자체가 없다 | 07 스펙은 body 500 / sub 400 / micro 500을 요구하는데 이를 강제하는 토큰도 테스트도 없다. 컴포넌트가 임의 weight를 쓰면 아무도 잡지 못한다 |

**왜 이번 라운드에서 고치지 않는가:** radius를 Figma Variables로 완전히 옮기려면 비대칭 radius(`.book-cover`)를 못 담는 문제(§6.5)와
얽혀 있고, 타이포 weight/line-height를 토큰화하려면 `semantic.json`에 새 그룹을 추가하고 `globals.css`의 유틸리티 구조를
바꿔야 한다 — 둘 다 "컴포넌트 0줄 수정"을 지키면서 이번 라운드 범위(§3.1)를 넘어선다. 라운드 2 이후, 컴포넌트 작업과 함께
다시 설계하는 것을 과제로 남긴다.

### 미결: `baseline.json`의 역할 전환 (최종 리뷰에서 확인, 2026-07-26)

`tests/baseline.json`은 지금 "이사 전 `globals.css` 값을 동결한 기록" 역할이다. 반면 `scripts/update-baseline.ts`는
"`dist/tokens.css`의 현재 승인값으로 갱신"하는 도구다. 이번 라운드에서는 `--secondary`·`--muted`가 §5.2에서
의도적으로 값이 바뀌었기 때문에, 지금 `update-baseline`을 그냥 돌리면 이 두 토큰에 diff 가 나고(정상) —
그 결과를 커밋하면 baseline 이 "이사 전 기록"이 아니게 되고, `tests/tokens.test.ts`의
`INTENTIONAL_VALUE_CHANGES`가 검사하던 이사 시점 값 변화 기록이 사라진다.

**라운드 2 착수 전에 결정해야 할 것:** Figma 에서 값을 바꿔 내려받는 시점부터 `baseline.json`의 역할을
"이사 전 기록"에서 "현재 승인값"으로 전환할지, 전환한다면 `INTENTIONAL_VALUE_CHANGES`(이사 시점 전용 예외 목록)를
비우고 갈지 다른 방식으로 대체할지. 이 결정 전까지는 `update-baseline`을 돌려도 그 결과를 커밋하지 않는다.
