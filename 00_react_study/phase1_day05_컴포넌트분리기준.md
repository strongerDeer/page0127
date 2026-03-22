# Day 05 — 컴포넌트 분리 기준

> Phase 1 | 2026-03-25
> 연결 코드: `widgets/book/ui/BookListItem.tsx`, `widgets/book/ui/LikeButton.tsx`

---

## 핵심 질문

> **"이걸 왜 컴포넌트로 분리했지?"**

분리하면 파일이 늘고 props가 늘어난다. 그래도 분리하는 이유가 있다.

---

## 실제 코드 — BookListItem과 LikeButton

`BookListItem`은 책 카드 전체를 담당하고, 좋아요 버튼만 `LikeButton`으로 분리되어 있다.

```
BookListItem (책 카드 전체)
└── LikeButton (좋아요 버튼만 담당)
```

**왜 LikeButton만 따로 뺐을까?**

```tsx
// LikeButton.tsx
export default function LikeButton({ bookId, initialLiked }: LikeButtonProps) {
  const [liked, setLiked]     = useState(initialLiked); // 자체 상태
  const [loading, setLoading] = useState(false);         // 자체 상태

  const toggleLike = async () => {
    await fetch('/api/books/like', ...);                 // 자체 API 호출
    setLiked(data.liked);
  };

  return <Button onClick={toggleLike}>...</Button>;
}
```

LikeButton은 **자기만의 state와 로직**을 가지고 있다.
이걸 BookListItem 안에 뒀다면 BookListItem이 책 렌더링 + 좋아요 상태 + API 호출을 전부 알아야 했다.

---

## 분리 기준 3가지

### 1. 재사용 — 다른 곳에서도 쓰는가?

```
LikeButton → BookListItem에서 쓰고, 나중에 상세 페이지에서도 쓸 수 있다
           → 분리 O

rank 뱃지  → BookListItem 안에서만 쓴다
           → 분리 X, 그냥 JSX 안에 인라인
```

### 2. 독립적인 책임 — 자기만의 상태 / 로직이 있는가?

```
LikeButton → liked, loading 상태 + API 호출
           → 분리 O

spine 이미지 fallback → if/else 렌더링만, 상태 없음
                      → 분리 X, 인라인으로 충분
```

### 3. 복잡도 — 분리하면 각각이 더 읽기 쉬운가?

```
LikeButton 50줄 + BookListItem 100줄  →  각각 읽기 쉽다
합치면 150줄                          →  한눈에 파악이 어렵다
```

---

## 분리하지 말아야 할 때

```tsx
// ❌ 과도한 분리 — 이건 그냥 인라인으로 써도 된다
function RankBadge({ rank }: { rank: number }) {
  return <div className="...">{rank}</div>;
}

// ✅ 이 정도면 충분
{rank && rank <= 3 && (
  <div className="...">{rank}</div>
)}
```

분리하면 파일이 늘고, props를 추적해야 한다. 상태도 없고 재사용도 안 된다면 인라인이 낫다.

---

## 판단 기준 요약

```
분리한다
├── 다른 곳에서 재사용된다
├── 자기만의 state / API 호출이 있다
└── 분리하면 각 파일이 더 읽기 쉬워진다

분리하지 않는다
├── 그 컴포넌트 안에서만 딱 한 번 쓴다
├── 상태 없이 렌더링만 한다
└── 분리해봤자 props만 늘어난다
```

---

## 오늘의 핵심

> **분리는 재사용, 책임 분리, 가독성 중 하나라도 해당될 때 한다.**
> 무조건 잘게 나누는 게 좋은 코드가 아니다.
