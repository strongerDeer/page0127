# Day 19 — useImperativeHandle: 컴포넌트가 노출할 API를 직접 설계

> "React는 선언형이지만, 브라우저는 명령형이다.
> useImperativeHandle은 그 경계에서 '내가 허용한 명령만 받겠다'고 선언하는 것이다."

## 오늘 읽을 코드

- [stats/BookSearchInput.tsx](../apps/page0127/src/features/stats/ui/BookSearchInput.tsx) — useImperativeHandle 적용 완료
- [widgets/Header/ui/Header.tsx](../apps/page0127/src/widgets/Header/ui/Header.tsx) — Server Component 구조 확인
- [widgets/Header/ui/HeaderClient.tsx](../apps/page0127/src/widgets/Header/ui/HeaderClient.tsx) — Client 분리 패턴

---

## 이 훅은 언제 나왔나? 왜 만들어졌나?

**React 16.8 (2019년 2월)** — `useState`, `useEffect`, `useRef` 등 모든 훅과 함께 등장.
최근 훅이 아니라 훅 시스템이 처음 생길 때부터 있었다.

### "React는 선언형인데 왜 명령형 훅이 있지?"

선언형의 한계가 아니라, **브라우저 DOM 자체가 명령형**이라서 생긴 타협점이다.

```
React가 제어하는 세계        브라우저 DOM 세계
────────────────────         ──────────────────
state, props, JSX            DOM API, 브라우저 API

완전히 선언형 가능            근본적으로 명령형
"이렇게 보여줘"               "지금 포커스 해", "지금 재생해"
```

`element.focus()`, `element.scrollIntoView()`, `video.play()` — 브라우저 API는 전부 "지금 당장 해!" 스타일.
React가 아무리 선언형이어도 DOM 위에서 돌아가는 이상 이 경계를 없앨 수 없다.

### 클래스 컴포넌트 시절엔 문제가 없었다

```jsx
// 클래스 컴포넌트는 인스턴스가 있어서 메서드 정의가 자연스러웠음
class SearchInput extends React.Component {
  focus() {
    this.inputEl.focus();
  }
  clear() {
    this.setState({ value: "" });
  }
}

// 부모에서 인스턴스 메서드 바로 호출
this.refs.search.focus();
```

그런데 **함수형 컴포넌트로 오면서 인스턴스가 사라졌다.**
함수는 실행되고 끝 — "이 컴포넌트의 메서드를 호출해"라는 게 불가능해진 것.

```
useImperativeHandle = 함수형 컴포넌트에서
                      클래스의 "인스턴스 메서드"를 대체하는 수단
```

> 요약: 선언형의 한계가 아니라 **"선언형으로 못 하는 영역(브라우저 명령형 API)을
> 안전하게 다루는 출입구"** + 클래스 → 함수형 전환 과정에서 잃어버린
> "인스턴스 메서드" 기능을 대체하는 역할.

---

## Imperative 단어부터 이해하기

React에는 두 가지 프로그래밍 방식이 공존한다.

```
Declarative (선언형)          Imperative (명령형)
────────────────────          ──────────────────
"이렇게 보여줘"                "지금 당장 이걸 해!"
상태로 UI를 기술               직접 동작을 트리거

<Input value={query} />       inputRef.current.focus()
<Modal isOpen={true} />       modalRef.current.open()
<List items={data} />         listRef.current.scrollToTop()
```

React의 기본은 Declarative다.
하지만 DOM 조작, 포커스, 스크롤, 애니메이션 트리거 같은 건
"지금 당장 실행"이 필요해서 Imperative가 불가피하다.

`useImperativeHandle` = 자식이 부모에게 노출할 **명령 인터페이스**를 직접 설계하는 훅

---

## 캡슐화(Encapsulation)란?

"내부 구현을 숨기고, 외부에는 필요한 것만 노출한다"는 원칙.

```
캡슐화 없음                         캡슐화 있음
────────────────────────────        ──────────────────────────────
내부가 전부 보임                     내부는 숨기고 인터페이스만 공개

자판기 내부 배선, 금고, 재고까지     버튼만 누를 수 있음
손댈 수 있음                         (콜라 버튼, 물 버튼, 거스름돈 반환)
```

코드 세계에서 캡슐화가 중요한 이유:

```
1. 안전성   — 외부에서 내부 상태를 직접 건드릴 수 없음
2. 유연성   — 내부 구현이 바뀌어도 인터페이스가 유지되면 외부 코드는 안 바꿔도 됨
3. 명확성   — "이것만 써라"고 의도가 드러남
```

`useImperativeHandle`은 **ref를 통한 캡슐화 도구**다.
DOM 전체를 노출하는 대신, 자식이 허용한 메서드만 외부에서 호출 가능하게 한다.

---

## 문제: ref as prop은 캡슐화가 없다

### ref as prop만 쓰면

```tsx
// 부모
const inputRef = useRef<HTMLInputElement>(null);
<BookSearchInput ref={inputRef} />;

// 부모가 접근 가능한 것 (DOM 전체가 노출됨)
inputRef.current.focus(); // ✅ 의도한 사용
inputRef.current.value = "hack"; // ✅ 근데 이것도 됨 — 내부 상태 우회
inputRef.current.style.display = "none"; // ✅ 이것도 됨 — 외부에서 숨겨버리기
inputRef.current.remove(); // ✅ DOM에서 아예 제거도 됨 💀
```

DOM을 통째로 넘기면 부모가 뭐든 할 수 있다.
자식 컴포넌트 내부 구현이 외부에 그대로 노출되는 것.

### useImperativeHandle을 쓰면

```tsx
// 자식이 직접 API를 정의
useImperativeHandle(ref, () => ({
  focus: () => inputRef.current?.focus(),
  clear: () => {
    setInputValue("");
    onSearchChange("");
  },
}));

// 부모가 접근 가능한 것 (딱 이것만)
searchRef.current.focus(); // ✅
searchRef.current.clear(); // ✅
searchRef.current.value; // ❌ undefined — 노출 안 함
searchRef.current.remove; // ❌ undefined — 노출 안 함
```

자식이 "이것만 써라"고 계약을 정의한 것.

---

## 언제 써야 하나?

> **부모가 자식에게 "지금 당장 뭔가 해!"라고 트리거해야 할 때**

### 실무에서 자주 만나는 케이스

```
케이스 1. 단축키 → 검색창 포커스
  '/' 키 누름 → searchRef.current.focus()

케이스 2. 외부 버튼 → 내부 상태 초기화
  "필터 초기화" 버튼 클릭 → filterRef.current.clear()

케이스 3. 여러 폼 컴포넌트 → 일괄 검증
  "제출" 클릭 → formRef.current.validate()

케이스 4. 모달 내부 스크롤 제어
  새 댓글 추가 → commentListRef.current.scrollToBottom()

케이스 5. 비디오/오디오 플레이어 제어
  재생목록 → playerRef.current.play() / .pause() / .seek(30)
```

### 반대로, 이럴 땐 useState로 해결 가능

```
부모가 자식의 상태를 제어하고 싶다
  → props로 내려주면 된다 (isOpen, value, disabled 등)
  → 상태 끌어올리기(lifting state up)로 해결

자식이 완료/변경을 부모에게 알리고 싶다
  → 콜백 props로 해결 (onChange, onSubmit 등)
```

useImperativeHandle은 "props/callback으로 못 해결하는 명령형 트리거"에만 쓴다.
남용하면 React의 데이터 흐름을 깨뜨리는 안티패턴이 된다.

---

## 실무에서 얼마나 자주 쓰나?

솔직히 말하면 **많지 않다.** 실무에서 꽤 드문 케이스.

대부분은 props/state로 해결된다:

```
모달 열기/닫기  → isOpen state 끌어올리기
인풋 초기화     → value를 state로 관리, 부모에서 setValue('')
포커스          → autoFocus prop, 또는 단순 ref as prop으로 충분
```

useImperativeHandle이 진짜 필요한 상황:

```
1. 라이브러리 만들 때
   → 내부 구현 숨기고 깔끔한 API만 노출해야 할 때

2. 서드파티 통합
   → 레거시 jQuery나 vanilla JS 코드가 React 컴포넌트를 제어해야 할 때

3. 복잡한 폼 라이브러리 (react-hook-form 같은 것 직접 만들 때)
   → 폼 필드들을 외부에서 일괄 validate/reset 트리거

4. 애니메이션/미디어
   → 비디오 플레이어, 복잡한 canvas 제어
```

page0127에서 쓴 케이스도 사실 props로 해결 가능하다:

```tsx
// useImperativeHandle 없이도 가능한 방법
const [shouldFocus, setShouldFocus] = useState(false);
<BookSearchInput
  shouldFocus={shouldFocus}
  onFocusDone={() => setShouldFocus(false)}
/>;
```

다만 트리거가 자주 발생하면 state 관리가 지저분해지고,
**"이 컴포넌트가 어떤 명령을 받을 수 있는지"를 타입으로 명시한다**는 점에서
캡슐화 관점에서 ref 방식이 더 깔끔한 경우가 있다.

> **결론:** 직접 쓸 일은 1년에 1~2번 있을까 말까.
> 하지만 shadcn, react-hook-form, Radix UI 같은 라이브러리 내부에서는 자주 씀.
> "읽고 이해하는 능력"은 필요하고, "직접 설계할 일"은 많지 않다.

---

## 디자인 시스템 작업할 때 써야 할까?

**→ 적극 고려할 만하다.** 단, 모든 컴포넌트에 쓰는 게 아니라 기준이 있다.

### 디자인 시스템에서 유용한 이유

디자인 시스템은 사용하는 팀이 내부 구현을 모른 채 쓰는 게 목표다.
이게 캡슐화가 중요한 이유와 정확히 일치한다.

```
내부 구현이 바뀌어도           사용하는 팀은 코드를 안 바꿔도 됨
────────────────────           ─────────────────────────────────
Input → Textarea로 교체        inputRef.current.focus() 그대로 동작
내부 DOM 구조 리팩토링          clear(), validate() 계약은 유지
```

### 쓰면 좋은 컴포넌트 유형

```
Input, Textarea, Select        → focus(), clear(), select()
Modal, Drawer, Tooltip         → open(), close()
Form                           → validate(), reset(), getValues()
DatePicker, ColorPicker        → open(), setValue()
InfiniteList, VirtualScroll    → scrollToTop(), scrollToIndex()
MediaPlayer                    → play(), pause(), seek()
```

### 쓰지 않아도 되는 컴포넌트

```
Button         → 클릭은 onClick prop으로 충분
Badge, Tag     → 표시만 하면 됨, 명령형 트리거 불필요
Typography     → 텍스트 렌더링, 제어 필요 없음
Layout 컴포넌트 → 구조만 잡으면 됨
```

### 실제 shadcn이 하는 방식 참고

shadcn은 Radix UI 위에 스타일을 얹는 구조라서,
Radix가 이미 `useImperativeHandle`로 내부를 캡슐화해 두었다.
shadcn 컴포넌트를 쓸 때 내부 DOM 구조를 신경 안 써도 되는 이유가 이것.

```tsx
// shadcn Input 컴포넌트 — ref를 그대로 통과시키는 단순한 케이스
// 복잡한 컴포넌트(Select, Dialog 등)는 Radix 내부에서 useImperativeHandle 사용
```

### 의견 정리

디자인 시스템에서 useImperativeHandle을 쓰면:

- 사용처에서 내부 DOM에 접근할 수 없어 **의도치 않은 조작 방지**
- 내부를 자유롭게 리팩토링해도 **API 계약만 지키면 호환 유지**
- "이 컴포넌트로 뭘 할 수 있나"가 **타입으로 명시** → 문서화 효과

다만 오버엔지니어링 주의.
**단순히 DOM ref를 넘겨도 되는 컴포넌트에까지 쓰면 불필요한 복잡도.**
판단 기준은 동일: "내부 구현을 숨겨야 할 이유가 있는가?"

---

## 핵심 구조 (React 19)

```tsx
// ① 부모에게 노출할 메서드 타입을 명시적으로 정의
export type BookSearchInputHandle = {
  focus: () => void;
  clear: () => void;
};

type Props = {
  onSearchChange: (query: string) => void;
  placeholder?: string;
  // React 19: ref가 일반 prop — forwardRef 불필요
  ref?: React.Ref<BookSearchInputHandle>;
};

export const BookSearchInput = ({ onSearchChange, placeholder, ref }: Props) => {
  const [inputValue, setInputValue] = useState('');

  // ② 내부 전용 ref — DOM에 직접 접근용, 외부에 노출 안 함
  const inputRef = useRef<HTMLInputElement>(null);

  // ③ 부모의 ref.current에 이 객체를 연결
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      setInputValue('');
      onSearchChange('');
    },
  }));

  return <Input ref={inputRef} value={inputValue} ... />;
  //              ↑ inputRef (내부용)
  //     외부 ref는 Input에 연결 안 함 — DOM이 숨겨짐
};
```

### ref가 두 개인 이유

```
inputRef (내부)   →  실제 DOM input에 연결 — focus() 같은 DOM API 호출용
ref (외부)        →  부모에게 넘겨받은 ref — 여기에 메서드 객체를 연결
```

---

## page0127 실제 사례

### 구조 한눈에 보기

```
stats 페이지
├── searchRef = useRef<BookSearchInputHandle>()   ← 부모가 ref 생성
│
├── useEffect: 'Escape' 키 → searchRef.current.clear()  ← 명령 트리거
│
└── <BookSearchInput ref={searchRef} ... />
        ├── inputRef (내부 DOM ref)
        └── useImperativeHandle(ref, () => ({
                focus: () => inputRef.current?.focus(),
                clear: () => setInputValue('') + onSearchChange('')
            }))
```

### 왜 Header에서 직접 못 하나?

```
Header (Server Component)          stats/page.tsx (Client Component)
┌────────────────────────┐         ┌──────────────────────────┐
│ async function Header()│         │ const searchRef = useRef │
│                        │   ???   │                          │
│ // useRef 못 씀        │ ──────▶ │ <BookSearchInput         │
│ // useEffect 못 씀     │         │   ref={searchRef} />     │
│ // 이벤트 핸들러 못 씀 │         └──────────────────────────┘
└────────────────────────┘
Server Component는 브라우저 API 접근 불가
```

→ HeaderClient(Client Component)에서 키 감지 → router로 페이지 이동 + 쿼리스트링 전달
→ 페이지에서 쿼리스트링 읽고 `searchRef.current.focus()` 호출

---

## 정리

|                       | ref as prop                   | useImperativeHandle            |
| --------------------- | ----------------------------- | ------------------------------ |
| 부모가 접근 가능한 것 | DOM 노드 전체                 | 정의한 메서드만                |
| 캡슐화                | 없음                          | 있음                           |
| 사용 시점             | 단순 DOM 접근 (focus, scroll) | 내부 로직을 추상화해 노출할 때 |
| React 19 변경점       | forwardRef 불필요             | 동일 (forwardRef만 제거)       |

**판단 기준:**

- DOM을 직접 줘도 되면 → `ref as prop`
- 내부를 숨기고 특정 동작만 노출하고 싶으면 → `useImperativeHandle`
- props/callback으로 해결 가능하면 → ref 자체가 불필요

---

## 오늘 실험

1. **`/` 단축키 포커스**: `books/add/page.tsx`에서 `/` 키 입력 시 `searchRef.current.focus()` 호출
2. **`Escape` 단축키 초기화**: `stats/DashboardBookList`에서 `Escape` 키 입력 시 `searchRef.current.clear()` 호출

---

## 다음 Day 예고

**Day 20 — useReducer: 교체 기준**

- `useState` 여러 개가 함께 바뀌는 상황 → `useReducer`로 전환
- 책장 필터 상태 (`SET_TAB / SET_SORT / SET_GENRE / RESET`) 리팩토링
