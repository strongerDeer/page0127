# Day 12 — useState: 불변성

> React에서 배열·객체 state를 업데이트할 때 직접 수정하면 안 된다. 왜 그런지, 어떻게 해야 하는지 page0127 코드로 확인한다.

---

## 오늘 읽을 코드

- [BookRegistrationForm.tsx:113](../apps/page0127/src/features/book/ui/BookRegistrationForm.tsx#L113) — 태그 배열 처리

---

## 핵심 개념

### React는 참조(reference)로 state 변경을 감지한다

```tsx
const [tags, setTags] = useState(['자기계발', '경영']);
```

React는 `setTags`가 호출될 때 **이전 참조와 새 참조가 다른지** 비교한다.

```
이전 참조: 0x001 → ['자기계발', '경영']
새 참조:   0x002 → ['자기계발', '경영', '추천']  ← 다르다 → 리렌더링!
```

---

## 문제: 배열을 직접 수정하면 참조가 바뀌지 않는다

```tsx
// ❌ 잘못된 방법 — push는 같은 배열을 수정한다
const handleAddTag = (newTag: string) => {
  tags.push(newTag); // 배열 내용은 바뀌지만 참조(주소)는 그대로
  setTags(tags);     // React: "이전이랑 같은 참조잖아?" → 리렌더링 안 함
};
```

```
이전 참조: 0x001 → ['자기계발', '경영']
push 후:   0x001 → ['자기계발', '경영', '추천']  ← 참조가 같다!
setTags(0x001)  → React가 변경으로 인식 못 함
```

버그: UI가 업데이트되지 않는다.

---

## 해결: 새 배열을 만들어서 넘긴다

```tsx
// ✅ 올바른 방법 — spread로 새 배열 생성
const handleAddTag = (newTag: string) => {
  setTags([...tags, newTag]); // 새 배열 → 새 참조 → 리렌더링
};

// ✅ 삭제
const handleRemoveTag = (targetTag: string) => {
  setTags(tags.filter((tag) => tag !== targetTag)); // filter도 새 배열 반환
};

// ✅ 수정
const handleUpdateTag = (index: number, newTag: string) => {
  setTags(tags.map((tag, i) => (i === index ? newTag : tag))); // map도 새 배열 반환
};
```

| 원본 수정 (❌) | 새 배열 생성 (✅) |
|--------------|----------------|
| `push` | `[...arr, item]` |
| `splice` | `filter`, `slice` + `concat` |
| `arr[i] = x` | `map((v, i) => i === idx ? x : v)` |
| `sort()` | `[...arr].sort()` |

---

## page0127에서 확인하기

[BookRegistrationForm.tsx:113-128](../apps/page0127/src/features/book/ui/BookRegistrationForm.tsx#L113)

```tsx
// 태그 처리: 쉼표로 구분, 중복 제거, 10개 제한
if (tagsInput.trim()) {
  const tags = tagsInput
    .split(',')          // 새 배열 반환
    .map((tag) => tag.trim())  // 새 배열 반환
    .filter((tag) => tag);     // 새 배열 반환

  // 중복 제거 (Set → Array.from으로 새 배열 생성)
  const uniqueTags = Array.from(new Set(tags));

  formData.tags = uniqueTags;
}
```

`split → map → filter → Array.from` 체인이 전부 **새 배열을 반환**한다. 원본을 수정하는 코드가 하나도 없다. 이게 불변성을 지키는 방식이다.

---

## 객체도 동일하다

```tsx
// ❌ 객체 직접 수정
const handleUpdateBook = (newTitle: string) => {
  book.title = newTitle; // 같은 참조 — React가 변경 못 감지
  setBook(book);
};

// ✅ 새 객체 생성
const handleUpdateBook = (newTitle: string) => {
  setBook({ ...book, title: newTitle }); // 새 참조 → 리렌더링
};
```

BookRegistrationForm의 `handleSubmit`에서도 새 객체를 만든다:

```tsx
// apps/page0127/src/features/book/ui/BookRegistrationForm.tsx:90
const formData: BookFormData = {
  status,
  rating,
  one_line_review: oneLineReview || undefined,
  // ...
};
// 기존 state를 수정하지 않고 새 객체를 만들어서 넘김
```

---

## 중첩 객체 주의

```tsx
const [user, setUser] = useState({
  name: '홍길동',
  address: { city: '서울', zip: '12345' }
});

// ❌ 얕은 복사 — address 내부는 여전히 같은 참조
setUser({ ...user, address: { city: '부산' } }); // zip이 사라짐

// ✅ 중첩까지 spread
setUser({ ...user, address: { ...user.address, city: '부산' } });
```

중첩이 깊어지면 [Immer](https://immerjs.github.io/immer/) 같은 라이브러리를 쓰는 것도 방법이다.

---

## 정리

| 방식 | 참조 | React 감지 | 리렌더링 |
|------|------|----------|--------|
| `push`, 직접 수정 | 동일 | ❌ | 안 됨 |
| `spread`, `filter`, `map` | 새 참조 | ✅ | 됨 |

**기억할 것**: state 안의 배열·객체는 절대 직접 수정하지 말고, 항상 새 배열·객체를 만들어서 `setState`에 넘긴다.

---

## 오늘 실험

1. [BookRegistrationForm.tsx:113](../apps/page0127/src/features/book/ui/BookRegistrationForm.tsx#L113) 열기
2. `Array.from(new Set(tags))` 부분이 왜 이렇게 작성됐는지 이해하기
   - `new Set(tags)` → 중복 제거 (Set은 중복 불허)
   - `Array.from(...)` → Set을 배열로 변환 (새 배열 생성)
3. 아래 코드를 직접 콘솔에서 실험해보기:
   ```js
   const arr = [1, 2, 3];
   const arr2 = arr;
   arr2.push(4);
   console.log(arr === arr2); // true — 같은 참조!

   const arr3 = [...arr];
   console.log(arr === arr3); // false — 새 참조
   ```

---

## 다음 Day 13

`useEffect` — 기본 패턴 (탭 변경 시 localStorage 저장 effect 작성)
