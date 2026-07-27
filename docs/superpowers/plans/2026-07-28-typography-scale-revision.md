# 타이포 스케일 재검토 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `font-semibold`(600) 78곳을 `font-medium`(500)으로 통일하고, 07 문서의 타이포 스케일을 실제 구현과 맞춘다.

**Architecture:** 코드는 단순 클래스 치환 하나뿐이다(54개 파일 78곳). 나머지는 07 문서 개정과 Figma Text Style 이름 변경이다. 치환은 기계적이지만 **제목이 가벼워지는 시각 변화**가 있으므로 실측과 육안 확인이 검증의 핵심이다.

**Tech Stack:** Tailwind v4, Playwright(시각 실측), vitest, MCP `use_figma`

**설계 문서:** `docs/superpowers/specs/2026-07-28-typography-scale-revision-design.md`

## Global Constraints

- **커밋 메시지에 `Co-Authored-By: Claude` 트레일러를 절대 넣지 않는다.** (`CLAUDE.md` 6번)
- **`font-semibold` → `font-medium` 치환만 한다.** 크기 클래스(`text-*`)는 한 곳도 건드리지 않는다 — 크기 쪽 결정은 전부 문서 개정으로 끝난다.
- **`font-bold`(700)와 `font-normal`(400)은 그대로 둔다.** 07 의 3단계에 이미 있다.
- 기존 테스트 4종이 계속 통과해야 한다.
- Figma 파일 키: `5ErSDsG1MNfvexSDZ2PfLS` / `Semantic` 컬렉션: `VariableCollectionId:13:2`
- **MCP `use_figma` 호출 전 `figma-use` 스킬을 읽고** `skillNames` 에 `resource:figma-use` 를 넣는다.

---

## 착수 전 확인한 것

**07 문서가 라운드 1 결정도 반영되지 않은 상태다.** `00_docs/07_리디자인_진단_및_실행안.md` §2.2 는 여전히 이렇게 되어 있다:

- 제목이 "스케일 **6개**로 못 박는다"
- 표에 `caption 13/20` 이 있다 — **라운드 1에서 "실사용 0곳"이라 제외하기로 한 것**
- `display-mobile`·`heading-mobile` 이 없다 — 라운드 1에서 추가한 것

즉 07 §2.2 는 **설계 시점(라운드 1 이전)에 멈춰 있다.** 이번 개정에서 라운드 1 결정까지 함께 반영해야 문서가 실제와 맞는다. Task 2 가 이것을 다룬다.

---

## File Structure

**수정**

| 파일 | 변경 |
|---|---|
| `apps/page0127` 아래 `.tsx` **54개** | `font-semibold` → `font-medium` (78곳) |
| `00_docs/07_리디자인_진단_및_실행안.md` | §2.2 전면 개정 |
| `docs/superpowers/specs/2026-07-27-design-system-round2-components-design.md` | §8.5 ③ 의 미결을 닫는다 |

**Figma** (파일 없음)

| 대상 | 변경 |
|---|---|
| Text Style `display-mobile` · `heading-mobile` | `display-sm` · `heading-sm` 로 개명 |
| `Card` · `AlertDialog` 컴포넌트의 Title | weight 600 → 500 |

---

## Task 1: `font-semibold` 78곳을 `font-medium` 으로 치환

**Files:**
- Modify: `apps/page0127/src/**/*.tsx`, `apps/page0127/app/**/*.tsx` — 54개 파일

**Interfaces:**
- Produces: 코드에 `font-semibold` 가 0건. Task 3 의 Figma weight 변경이 이 결과와 일치해야 한다.

---

- [ ] **Step 1: 치환 전 개수를 기록한다**

Run:
```bash
grep -rho "font-semibold" apps/page0127/src apps/page0127/app --include="*.tsx" | wc -l
grep -rl "font-semibold" apps/page0127/src apps/page0127/app --include="*.tsx" | wc -l
```
Expected: `78` 과 `54`

숫자가 다르면 **멈추고 보고한다.** 그 사이 다른 세션이 코드를 바꿨다는 뜻이므로, 계획의 전제를 다시 확인해야 한다.

- [ ] **Step 2: 변형된 형태가 있는지 확인한다**

`data-[state=open]:font-semibold` 처럼 수식어가 붙은 형태가 있으면 단순 치환이 위험하다.

Run:
```bash
grep -rho "[a-z0-9:\[\]=-]*font-semibold" apps/page0127/src apps/page0127/app --include="*.tsx" | sort -u
```
Expected: `font-semibold` 한 종류만 나온다.

다른 형태가 나오면 그 목록을 보고하고 멈춘다.

- [ ] **Step 3: 일괄 치환한다**

```bash
grep -rl "font-semibold" apps/page0127/src apps/page0127/app --include="*.tsx" \
  | xargs sed -i '' 's/font-semibold/font-medium/g'
```

> macOS 의 `sed` 는 `-i` 에 빈 문자열 인자가 필요하다(`-i ''`). Linux 라면 `sed -i` 만 쓴다.

- [ ] **Step 4: 치환 결과를 확인한다**

Run:
```bash
grep -rc "font-semibold" apps/page0127/src apps/page0127/app --include="*.tsx" | grep -v ":0$" | wc -l
grep -rho "font-medium" apps/page0127/src apps/page0127/app --include="*.tsx" | wc -l
```
Expected: 첫 명령 `0` (남은 파일 없음), 둘째 명령 `161` (기존 83 + 치환 78)

- [ ] **Step 5: 테스트·lint·타입체크**

Run:
```bash
npm run test && npm run lint && npm run type-check
```
Expected: 전부 통과

> 클래스 문자열만 바뀌므로 테스트가 깨질 이유는 없다. 깨진다면 치환이 의도치 않은 곳(문자열 리터럴 등)에 닿은 것이니 그 위치를 보고한다.

- [ ] **Step 6: 개발 서버를 띄우고 실측한다**

이 태스크의 **핵심 검증**이다. 클래스 치환은 기계적이지만 결과는 시각적이다.

```bash
npm run dev --workspace page0127 -- --port 3100
```

> 이 worktree 에 `apps/page0127/.env.local` 이 없으면 서버가 500 을 낸다. 있는 곳에서 복사한다(gitignore 대상이라 커밋되지 않는다).

`http://localhost:3100/` 에서 Playwright 로 확인한다:

```js
() => {
  const weights = {};
  for (const el of document.querySelectorAll('h1,h2,h3,h4,p,span,div,strong')) {
    const w = getComputedStyle(el).fontWeight;
    const txt = (el.textContent || '').trim();
    if (!txt || txt.length > 40) continue;
    weights[w] = (weights[w] || 0) + 1;
  }
  return weights;
}
```

확인 항목:
- **`600` 이 0 이어야 한다** — 하나라도 있으면 치환이 닿지 않은 경로(인라인 스타일, CSS Module 등)가 있다는 뜻이다
- `500` 이 이전보다 늘어야 한다
- `400`·`700` 은 그대로

**서버 종료를 잊지 말 것.**

- [ ] **Step 7: 육안으로 확인한다**

같은 서버에서 홈 화면을 보고 **제목이 지나치게 가벼워지지 않았는지** 본다. 이번 변경의 유일한 위험이 이것이다.

특히 볼 곳: 섹션 제목, 카드 제목, 통계 숫자 옆 라벨.

**가벼워 보이는 것 자체는 의도된 결과다**(500 은 600 보다 가볍다). 판단 기준은 "본문(400)과 구분이 되는가" 다. 구분이 안 되는 자리가 있으면 **되돌리지 말고 그 위치를 보고**한다 — 그 자리는 500 이 아니라 700 이어야 할 수도 있고, 그건 개별 판단이다.

- [ ] **Step 8: 커밋**

```bash
git add apps/page0127
git commit -m "style(typo): font-semibold 를 font-medium 으로 통일한다

07 §2.2 의 weight 3단계는 400/500/700 인데 600 이 78곳에서 쓰이고 있었다.
같은 14px 텍스트에 500 이 21곳, 600 이 25곳으로 섞여 있어 위계가 흐려진 상태였다.

실측 결과 600 은 shadcn 잔재가 아니라 앱 코드가 73곳에서 직접 선택한 값이었다.
07 이 '교보 400/500/700 · 밀리 400/600/700' 을 알면서 교보를 골랐고 코드는
반대로 갔던 것 — 원칙 위반이 아니라 합의된 적 없는 갈림길이었다.

시각 비교 후 500 을 택했다. 400·500·700 의 간격이 넓어 위계가 또렷하고
700 이 강조의 최상단으로 분명해진다."
```

---

## Task 2: 07 문서 §2.2 를 실제와 맞춘다

**Files:**
- Modify: `00_docs/07_리디자인_진단_및_실행안.md` — §2.2
- Modify: `docs/superpowers/specs/2026-07-27-design-system-round2-components-design.md` — §8.5 ③

**Interfaces:**
- Consumes: Task 1 의 치환 결과(코드에 600 이 0건)

---

- [ ] **Step 1: §2.2 의 제목과 스케일 표를 교체한다**

`00_docs/07_리디자인_진단_및_실행안.md` 에서 `### 2.2 타이포그래피 — Pretendard, 스케일 6개` 로 시작하는 섹션을 찾는다.

**`**스케일 6개로 못 박는다**` 로 시작하는 문단부터 `- **다행 텍스트는 line-height를 따로 준다.**` 로 끝나는 목록까지**를 아래로 교체한다. (그 위의 `--font-sans` 코드블록과 `letter-spacing` 정정 인용문은 **그대로 둔다**.)

```markdown
**스케일 7단 + `stat`** (교보 실사용 6종·상위 3개가 99% / 밀리 토큰은 다단이나 실사용은 14·12·20px에 집중)

| 토큰 | size / line-height | weight | 용도 |
| --- | --- | --- | --- |
| `display` | 28 / 40 | 700 | 랜딩 h1 (**50px → 28px**) |
| `display-sm` | 24 / 34 | 700 | 좁은 화면의 h1, 강조 제목 |
| `heading` | 20 / 30 | 700 | 섹션 제목 (밀리도 20px) |
| `heading-sm` | 18 / 27 | 700 | 카드·모달 제목, 좁은 화면의 섹션 제목 |
| `body` | 16 / 24 | **500** | 책 제목 |
| `sub` | 14 / 22 | 400 | 저자·설명 (밀리 최다 198회) |
| `micro` | 12 / 18 | 500 | 뱃지·메타 |

별도 역할 하나를 둔다. 위계가 아니라 **수치 표시**다.

| 토큰 | size | 용도 |
| --- | --- | --- |
| `stat` | 30 · 36 | 통계 숫자 전용. 문장에 쓰지 않는다 |

- **weight 3단계만**: 400 / 500 / 700. (교보 400·500·700 / 밀리 400·600·700 — 둘 다 3종)
- **책 제목은 400이 아니라 500.** 교보의 최다 weight가 500(227회)인 이유 — 목록에서 제목이 먼저 잡힌다.
- 소수점 크기(`15.2px`) 박멸.
- **다행 텍스트는 line-height를 따로 준다.** 밀리는 토큰 자체를 분리했다 — `body14-single 14/18` vs `body14-multi 14/22`.

> **개정 이력**
>
> **2026-07-26 (라운드 1):** `caption 13/20` 을 뺐다 — 실사용이 **0곳**이었고, 12와 14 사이에 한 단을 더 끼우면 위계가 선명해지는 게 아니라 흐려진다. 대신 `.heading-1`·`.heading-2` 의 모바일 값을 `display-mobile`·`heading-mobile` 로 명시했다.
>
> **2026-07-28 (실측 재검토):** 두 가지를 고쳤다.
>
> 1. **`-mobile` 접미사를 `-sm` 으로 바꿨다.** 모바일 전용처럼 읽혔으나 실제로는 데스크톱에서도 쓰인다 — 18px 21곳, 24px 4곳. 단계가 는 것이 아니라 이름만 바뀌었다.
> 2. **weight 를 500 으로 통일했다.** 코드가 `font-semibold`(600)를 78곳에서 쓰고 있었고 그중 73곳이 앱 코드였다 — shadcn 잔재가 아니라 직접 선택한 값이다. 같은 14px 에 500 이 21곳·600 이 25곳으로 **섞여** 있어 위계가 흐려진 상태였다. 위 표가 이미 400/500/700 을 정해뒀으므로 코드를 그쪽으로 맞췄다.
>
> 상위 3개(14·12·16px)가 실사용의 **97%** 라는 실측은 이 문서의 원래 관찰과 일치했다 — 크기 판단은 옳았고, 어긋난 것은 weight 하나였다.
```

- [ ] **Step 2: 개정 결과를 확인한다**

Run:
```bash
grep -c "caption" 00_docs/07_리디자인_진단_및_실행안.md
grep -n "display-sm\|heading-sm\|stat" 00_docs/07_리디자인_진단_및_실행안.md | head -5
```
Expected: 첫 명령이 `0`(caption 이 문서에서 사라짐), 둘째 명령에 새 토큰들이 나온다.

> `caption` 이 0 이 아니면 §2.2 밖의 다른 곳에서도 언급되고 있다는 뜻이다. 그 위치를 확인하고 함께 정리할지 보고한다.

- [ ] **Step 3: 라운드 2 스펙의 미결을 닫는다**

`docs/superpowers/specs/2026-07-27-design-system-round2-components-design.md` 에서 `**③ Title 계열 3개가 07 타이포 스케일을 벗어난다 — 코드를 고치지 않았다.**` 문단을 찾아, 그 문단 **끝에** 아래를 덧붙인다(기존 내용은 지우지 않는다 — 당시 판단의 기록이다):

```markdown
> **닫힘 (2026-07-28):** 재검토 결과 **07 스케일 쪽이 현실과 맞지 않았다.** `font-semibold`(600) 78곳 중 73곳이 앱 코드가 직접 선택한 값이었고, 500 과 600 이 같은 크기에서 섞여 있었다. weight 를 500 으로 통일하고(코드 78곳) 18·24px 를 정식 단계로 승격했다(문서만). 자세한 내용은 `2026-07-28-typography-scale-revision-design.md`.
```

- [ ] **Step 4: 커밋**

```bash
git add 00_docs/07_리디자인_진단_및_실행안.md docs/superpowers/specs/2026-07-27-design-system-round2-components-design.md
git commit -m "docs(07): 타이포 스케일을 실제 구현과 맞춘다

07 §2.2 가 설계 시점에 멈춰 있었다 — 라운드 1 에서 뺀 caption 13/20 이
그대로 있고, 추가한 모바일 2단은 없었다.

이번 개정으로 반영한 것:
- caption 제거 (라운드 1 결정, 실사용 0곳)
- display-sm 24/34 · heading-sm 18/27 추가 (-mobile 에서 개명)
  모바일 전용처럼 읽혔으나 데스크톱에서도 18px 21곳·24px 4곳이 쓰인다
- stat(30·36) 을 별도 역할로 분리 — 위계가 아니라 수치 표시다
- weight 500 통일의 경위 기록

개정 이력을 문서 안에 남겨 나중에 '왜 바뀌었나' 를 되짚을 수 있게 했다."
```

---

## Task 3: Figma 를 맞춘다

**Files:** 없음 (Figma 파일 작업)

**Interfaces:**
- Consumes: Task 1(코드 weight), Task 2(스케일 이름)

---

- [ ] **Step 1: Text Style 2개를 개명한다**

`display-mobile` → `display-sm`, `heading-mobile` → `heading-sm`.

크기·줄간격·weight 는 **건드리지 않는다**(24/34, 18/27). 이름만 바꾼다.

description 도 함께 고친다 — 기존 설명에 "모바일" 이라는 한정이 들어 있으면 "좁은 화면의 h1, 강조 제목" / "카드·모달 제목, 좁은 화면의 섹션 제목" 으로 바꾼다.

- [ ] **Step 2: 컴포넌트의 Title weight 를 500 으로 맞춘다**

`Components` 페이지에서 아래 텍스트 노드의 `fontName.style` 을 `SemiBold` → `Medium` 으로 바꾼다:

- `Card` 안의 `CardTitle`
- `AlertDialog` 안의 헤더 제목("정말 삭제할까요?")

**폰트 로드를 먼저 해야 한다** — `figma.loadFontAsync({ family: 'Pretendard', style: 'Medium' })` 를 `await` 한 뒤 바꾼다.

- [ ] **Step 3: `Card` 의 description 에서 weight 경고를 걷어낸다**

`Card` 컴포넌트 description 에 있는 아래 문단을 제거한다:

```
⚠️ CardTitle 의 font-semibold(600)는 07 §2.2 의 weight 3단계(400/500/700) 밖이다.
   이번 라운드는 shadow·dark: 만 정리하기로 합의해 코드를 건드리지 않았고,
   Figma 에도 600 그대로 반영했다. 500(body) 과 700(heading) 중 무엇으로
   맞출지는 별도 판단이 필요하다.
```

대신 한 줄을 넣는다:

```
CardTitle 은 weight 500 이다 (07 §2.2 의 3단계 중 중간).
2026-07-28 재검토에서 600 → 500 으로 통일했다.
```

- [ ] **Step 4: 결과를 확인한다**

읽기 전용 스크립트로 Text Style 이름과 컴포넌트 weight 를 조회한다:

```js
const styles = await figma.getLocalTextStylesAsync();
const page = figma.root.children.find((p) => p.name === 'Components');
await figma.setCurrentPageAsync(page);
const semibolds = page
  .findAll((n) => n.type === 'TEXT' && n.fontName && n.fontName.style === 'SemiBold')
  .map((n) => n.name);
return {
  styleNames: styles.map((s) => s.name),
  remainingSemiBold: semibolds,
};
```

Expected:
- `styleNames` 에 `display-sm`·`heading-sm` 이 있고 `-mobile` 은 없다
- `remainingSemiBold` 가 빈 배열

- [ ] **Step 5: 스펙에 완료를 기록하고 커밋**

`docs/superpowers/specs/2026-07-28-typography-scale-revision-design.md` 끝에 추가한다:

```markdown
---

## 8. 완료 기록 (2026-07-28)

- 코드: `font-semibold` → `font-medium` 78곳(54개 파일). 남은 600 은 0건
- 07 문서: §2.2 를 7단 + `stat` 으로 개정, 개정 이력 포함
- Figma: Text Style 2개 개명(`-mobile` → `-sm`), `CardTitle`·`AlertDialogTitle` weight 500
- 검증: Playwright 실측으로 화면의 `font-weight: 600` 이 0 임을 확인
```

```bash
git add docs/superpowers/specs/2026-07-28-typography-scale-revision-design.md
git commit -m "docs(spec): 타이포 스케일 재검토 완료 기록"
```

---

## 완료 기준

- [ ] 코드에 `font-semibold` 가 **0건**
- [ ] `font-medium` 이 161곳 (기존 83 + 치환 78)
- [ ] 테스트 4종 · lint · type-check 통과
- [ ] Playwright 실측에서 화면의 `font-weight: 600` 이 **0**
- [ ] 07 §2.2 에 `caption` 이 없고 `display-sm`·`heading-sm`·`stat` 이 있다
- [ ] Figma Text Style 에 `-mobile` 이 없고 `-sm` 이 있다
- [ ] Figma `Components` 페이지에 `SemiBold` 텍스트가 0개

---

## 이 작업이 남기는 것

**묶음 2~4 의 감사 기준이 단순해진다.** 지금까지는 스케일 밖 값을 발견해도 "고칠지 기록할지"를 매번 판단해야 했다. 이제 스케일이 실측과 맞으므로 **밖에 있으면 고친다**가 규칙이 된다.

묶음 2 착수 시 `dialog.tsx` 의 `DialogTitle` 이 이미 `font-medium` 이 되어 있을 것이다 — Task 1 의 일괄 치환에 포함되기 때문이다.
