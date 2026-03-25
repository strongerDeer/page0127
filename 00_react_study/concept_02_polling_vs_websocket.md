# 폴링 vs WebSocket

> 연결 코드: `entities/notification/lib/hooks/useNotificationRealtime.ts`

---

## 핵심 차이

```
폴링      → 앱이 주기적으로 서버에 "새 것 있어요?" 물어봄
WebSocket → 연결을 열어두고 서버가 생기면 바로 알려줌
```

---

## 폴링 (이전 방식)

```tsx
// useUnreadCount.ts (변경 전)
useQuery({
  queryFn: () => getUnreadCount(userId),
  refetchInterval: 1000 * 30, // 30초마다 API 호출
});
```

```
앱 →──────────── "알림 있어요?" ──────────→ 서버
앱 ←──────────── "없어요" ←────────────── 서버
(30초 대기)
앱 →──────────── "알림 있어요?" ──────────→ 서버
앱 ←──────────── "없어요" ←────────────── 서버
(30초 대기)
앱 →──────────── "알림 있어요?" ──────────→ 서버
앱 ←──────────── "1개 있어요" ←────────── 서버  ← 최대 30초 딜레이
```

**단점:** 알림이 생겨도 최대 30초 뒤에 표시됨

---

## WebSocket (현재 방식)

```tsx
// useNotificationRealtime.ts
useEffect(() => {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', { event: '*', table: 'notifications' }, () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    })
    .subscribe();

  return () => supabase.removeChannel(channel); // 클린업 필수
}, [userId, queryClient]);
```

```
앱 →──── "연결할게요" ──────────────────→ Supabase
앱 ←──── "연결됐어요, 기다리세요" ←────── Supabase

(누군가 알림을 보냄 → DB INSERT 발생)
앱 ←──── "방금 알림 생겼어요!" ←────────── Supabase  ← 즉시
앱: queryClient.invalidateQueries() 호출
앱: TanStack Query가 자동으로 최신 데이터 fetch
```

**장점:** DB에 알림이 INSERT되는 순간 즉시 뱃지 업데이트

---

## 실제 흐름 — 이 프로젝트

```
1. NotificationDropdown 마운트
2. useNotificationRealtime 실행
   → Supabase와 WebSocket 연결 (wss://...supabase.co)
3. 다른 사용자가 내 글에 좋아요 클릭
   → DB notifications 테이블에 INSERT
4. Supabase가 WebSocket으로 즉시 알려줌
5. invalidateQueries 실행
6. useUnreadCount 재요청 → 뱃지 숫자 업데이트
```

---

## 클린업이 왜 중요한가

```tsx
return () => {
  supabase.removeChannel(channel); // 이게 없으면?
};
```

```
헤더 컴포넌트 언마운트 (예: 로그아웃, 페이지 이동)
    ↓
클린업 없음
    ↓
WebSocket 연결이 계속 살아있음
    ↓
DB 변경될 때마다 이미 사라진 컴포넌트에 계속 이벤트 발생
    ↓
메모리 누수 + 콘솔 에러
```

클린업 함수가 있으면 컴포넌트가 사라질 때 연결을 정리한다.

---

## 언제 뭘 쓰는가

| 상황 | 방식 |
|------|------|
| 30초 딜레이 허용, 구현 단순하게 | 폴링 |
| 즉시 반영 필요 (채팅, 알림) | WebSocket |
| 서버 부하 최소화 | WebSocket |

채팅처럼 즉시성이 필수인 경우는 WebSocket이 필수다.
알림처럼 약간의 딜레이가 허용되면 폴링도 충분하다.
이 프로젝트는 UX 개선을 위해 WebSocket으로 업그레이드했다.

---

## Network 탭에서 확인하는 법

```
개발자도구 → Network → Socket 탭
→ wss://[프로젝트id].supabase.co 연결 확인
→ Messages 탭 클릭 → DB 변경 시 실시간 메시지 들어오는 거 확인 가능
```
