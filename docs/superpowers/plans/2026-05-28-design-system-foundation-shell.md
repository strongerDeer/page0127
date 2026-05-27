# 디자인 시스템 개편 — 1·2단계(토큰 + 사이드바 셸) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `globals.css`를 인디고 기반 단일 소스로 정리하고, 상단 헤더를 좌측 사이드바(데스크톱)/하단 탭바(모바일) 셸로 교체한다.

**Architecture:** Tailwind v4 + shadcn CSS 변수 방식. 색·반경·그림자는 `globals.css`가 단일 진실 공급원. 셸은 Server Component(`AppShell`)가 인증·프로필 데이터를 가져와 Client Component(`Sidebar`/`BottomTabBar`)에 원시 props로 내려준다.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, shadcn/ui, lucide-react, Supabase, FSD 구조.

> **참고:** 이 계획은 1·2단계까지다. 3단계(페이지별 마이그레이션)는 셸이 올라간 뒤 각 페이지를 직접 확인하며 별도 계획으로 작성한다. 설계 문서: [2026-05-28-design-system-redesign-design.md](../specs/2026-05-28-design-system-redesign-design.md)

> **검증 방식:** 디자인/CSS 작업이라 단위 테스트 대신 ① `npm run type-check` ② `npm run lint` ③ grep로 제거 대상 잔존 확인 ④ `npm run dev` 육안 확인으로 검증한다. 모든 명령은 `apps/page0127`에서 실행.

---

## File Structure

**1단계 (토큰):**
- Modify: `apps/page0127/app/globals.css` — 인디고 토큰화, 그라데이션·글래스·충돌 primary 제거
- Modify: `packages/design-tokens/tokens/core.json` — indigo 팔레트 추가
- Modify: `packages/design-tokens/tokens/light.json` — action.primary를 indigo 참조로 갱신

**2단계 (셸):**
- Create: `apps/page0127/src/widgets/AppShell/model/navItems.ts` — 메뉴 정의(단일 소스)
- Create: `apps/page0127/src/widgets/AppShell/ui/Sidebar.tsx` — 데스크톱 좌측 사이드바 (Client)
- Create: `apps/page0127/src/widgets/AppShell/ui/BottomTabBar.tsx` — 모바일 하단 탭바 (Client)
- Create: `apps/page0127/src/widgets/AppShell/ui/AppShell.tsx` — 셸 컴포지션 (Server)
- Create: `apps/page0127/src/widgets/AppShell/index.ts` — re-export
- Modify: `apps/page0127/app/(protected)/layout.tsx` — Header → AppShell 교체

---

## 1단계: 디자인 토큰 정리

### Task 1: `globals.css` 인디고 토큰화

**Files:**
- Modify: `apps/page0127/app/globals.css`

- [ ] **Step 1: 제거 대상 사용처 먼저 파악**

Run (apps/page0127에서):
```bash
grep -rn "glass\|var(--color-primary)\|var(--color-accent)\|var(--color-secondary)" src app | grep -v node_modules
```
Expected: 결과를 확인. 글래스 유틸이나 `var(--color-*)`를 직접 쓰는 곳이 있으면 Step 5 후 영향 확인용으로 기록만 해둔다. (없을 가능성이 높음)

- [ ] **Step 2: `:root` 블록을 인디고 토큰으로 교체**

`globals.css`의 `:root { ... }` 블록(현재 L10-61)을 아래로 교체한다. 학습 주석 포함.

```css
:root {
  /* 모서리 — 카드 12px 기준 (md/sm/xl은 @theme에서 계산) */
  --radius: 0.75rem;

  /* 배경: 옅은 회색 단색 / 텍스트: 슬레이트 */
  --background: #fafafa;
  --foreground: #1e293b;

  /* 표면 (카드·팝오버는 순수 흰색 + 테두리로 구분) */
  --card: #ffffff;
  --card-foreground: #1e293b;
  --popover: #ffffff;
  --popover-foreground: #1e293b;

  /* 강조색 — 인디고 단일화 */
  --primary: #6366f1;            /* indigo-500 */
  --primary-foreground: #ffffff;
  --secondary: #f1f5f9;          /* slate-100 */
  --secondary-foreground: #1e293b;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;   /* slate-500 */
  --accent: #eef2ff;             /* indigo-50 — 활성 메뉴/호버 배경 */
  --accent-foreground: #4338ca;  /* indigo-700 */

  /* 상태색 (강조색과 독립) */
  --destructive: #ef4444;

  /* 경계선·입력·포커스 링 */
  --border: #e5e7eb;             /* gray-200 */
  --input: #e5e7eb;
  --ring: #6366f1;

  /* 차트 — 인디고 메인 + 보조 파스텔 */
  --chart-1: #6366f1;            /* indigo */
  --chart-2: #818cf8;            /* indigo-400 */
  --chart-3: #34d399;            /* mint */
  --chart-4: #fbbf24;            /* amber */
  --chart-5: #fb7185;            /* rose */

  /* 사이드바 토큰 */
  --sidebar: #ffffff;
  --sidebar-foreground: #1e293b;
  --sidebar-primary: #6366f1;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #eef2ff;
  --sidebar-accent-foreground: #4338ca;
  --sidebar-border: #e5e7eb;
  --sidebar-ring: #6366f1;
}
```

이때 함께 **삭제**되는 것: 그라데이션 `--background-image`, 충돌하던 `--color-primary: #3B82F6`/`--color-secondary`/`--color-accent`, `--font-h1-*`·`--spacing-section-*`는 아래 Step 4의 유틸 클래스가 쓰므로 **별도 보존**(다음 스텝 참고).

- [ ] **Step 3: 보존할 커스텀 변수 재배치**

heading/section 유틸 클래스가 쓰는 변수는 살린다. `:root` 교체 시 빠졌다면 `:root` 안에 아래를 추가한다.

```css
  /* 랜딩 페이지 타이포/섹션 간격 (heading-1/2, section-spacing 유틸이 사용) */
  --font-h1-desktop: 50px;
  --font-h1-mobile: 36px;
  --font-h2-desktop: 36px;
  --font-h2-mobile: 28px;
  --spacing-section-desktop: 80px;
  --spacing-section-mobile: 40px;
```

- [ ] **Step 4: `@theme inline`에서 글래스 변수와 충돌 primary 제거 → 올바른 매핑으로 교체**

`@theme inline { ... }` 안의 글래스 3줄(`--glass-border`/`--glass-bg`/`--glass-shadow`)과 충돌 brand 3줄(`--color-primary: #ffd700;`/`--color-secondary: #2d3748;`/`--color-accent: #9f7aea;`)을 삭제하고, 그 자리에 아래 표준 매핑을 넣는다. (이게 `bg-primary`가 금색이던 버그의 핵심 수정)

```css
  /* shadcn 색 매핑 — Tailwind 유틸(bg-primary 등)이 CSS 변수를 따라가도록 */
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
```

> 주의: `@theme inline` 하단에 이미 `--color-primary-foreground`, `--color-secondary-foreground`, `--color-accent-foreground` 매핑이 중복으로 존재할 수 있다. 중복되면 하나로 정리(중복 라인 삭제).

- [ ] **Step 5: `body`에서 그라데이션 배경 제거**

`body { ... }` 블록(현재 L123-133)을 아래로 교체한다.

```css
body {
  background: #fafafa; /* 단색 — 그라데이션/글래스 제거 */
  color: var(--foreground);
  font-family: var(--font-geist-sans), Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 6: 타입체크·린트·grep 검증**

Run:
```bash
npm run type-check && npm run lint
grep -n "ffd700\|9f7aea\|3B82F6\|glass\|radial-gradient" app/globals.css
```
Expected: type-check/lint 통과. grep 결과 **0건**(제거 대상 잔존 없음).

- [ ] **Step 7: dev 서버로 육안 확인**

Run: `npm run dev`
확인: 배경이 옅은 회색 단색, 버튼·링크가 **인디고**, 그라데이션/글래스 사라짐. 로그인/대시보드 화면에서 강조색 확인.
→ 사용자 확인 대기.

- [ ] **Step 8: 커밋**

```bash
git add apps/page0127/app/globals.css
git commit -m "🎨 UI/UX: globals.css 인디고 토큰화 — 그라데이션·글래스·충돌 primary 제거"
```

---

### Task 2: design-tokens 패키지를 인디고 기준으로 갱신

**Files:**
- Modify: `packages/design-tokens/tokens/core.json`
- Modify: `packages/design-tokens/tokens/light.json`

- [ ] **Step 1: core.json에 indigo 팔레트 추가**

`core.color` 안 `primary` 팔레트 **다음**에 `indigo` 팔레트를 추가한다(기존 `primary` sky-blue는 보존 — 다른 참조 깨짐 방지).

```json
      "indigo": {
        "50": { "value": "#eef2ff", "type": "color" },
        "100": { "value": "#e0e7ff", "type": "color" },
        "400": { "value": "#818cf8", "type": "color" },
        "500": { "value": "#6366f1", "type": "color" },
        "600": { "value": "#4f46e5", "type": "color" },
        "700": { "value": "#4338ca", "type": "color" }
      },
```

- [ ] **Step 2: light.json의 action.primary를 indigo 참조로 갱신**

`light.color.action.primary`의 4개 값을 아래로 교체한다.

```json
        "primary": {
          "default": { "value": "{core.color.indigo.500}", "type": "color" },
          "hover": { "value": "{core.color.indigo.600}", "type": "color" },
          "active": { "value": "{core.color.indigo.700}", "type": "color" },
          "disabled": { "value": "{core.color.gray.300}", "type": "color" }
        },
```

- [ ] **Step 3: JSON 유효성 확인**

Run (레포 루트에서):
```bash
node -e "require('./packages/design-tokens/tokens/core.json'); require('./packages/design-tokens/tokens/light.json'); console.log('JSON OK')"
```
Expected: `JSON OK` 출력.

- [ ] **Step 4: 커밋**

```bash
git add packages/design-tokens/tokens/core.json packages/design-tokens/tokens/light.json
git commit -m "🎨 UI/UX: design-tokens 인디고 팔레트 추가 및 primary 갱신"
```

---

## 2단계: 사이드바 셸

### Task 3: 메뉴 정의(navItems)

**Files:**
- Create: `apps/page0127/src/widgets/AppShell/model/navItems.ts`

- [ ] **Step 1: navItems 작성**

```typescript
import {
  Bell,
  BarChart3,
  Home,
  Library,
  Newspaper,
  Search,
  Settings,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

// 메뉴 단일 소스 — 사이드바와 하단 탭바가 공유
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // 모바일 하단 탭바에 노출할 핵심 항목 여부
  primary?: boolean;
};

export const navItems: NavItem[] = [
  { href: '/dashboard', label: '홈', icon: Home, primary: true },
  { href: '/feed', label: '피드', icon: Newspaper, primary: true },
  { href: '/books', label: '서재', icon: Library, primary: true },
  { href: '/dashboard/taste-analysis', label: '통계', icon: BarChart3 },
  { href: '/search', label: '검색', icon: Search, primary: true },
  { href: '/notifications', label: '알림', icon: Bell },
  { href: '/settings', label: '설정', icon: Settings, primary: true },
];

// 활성 메뉴 판정 — '/dashboard'는 정확히 일치, 나머지는 하위 경로 포함
export const isNavItemActive = (pathname: string, href: string): boolean => {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};
```

- [ ] **Step 2: 타입체크**

Run: `npm run type-check`
Expected: 통과.

- [ ] **Step 3: 커밋**

```bash
git add apps/page0127/src/widgets/AppShell/model/navItems.ts
git commit -m "✨ Feat: AppShell 메뉴 정의(navItems) 추가"
```

---

### Task 4: Sidebar (데스크톱, Client)

**Files:**
- Create: `apps/page0127/src/widgets/AppShell/ui/Sidebar.tsx`

- [ ] **Step 1: Sidebar 작성**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import { NotificationDropdown } from '@/features/notification';
import { ProfileDropdown } from '@/features/profile';

import { isNavItemActive, navItems } from '../model/navItems';

// Server인 AppShell이 인증·프로필 데이터를 원시값으로 내려준다
type SidebarProps = {
  userId: string;
  photoUrl: string | null;
  displayName: string;
  username: string | null;
};

export const Sidebar = ({
  userId,
  photoUrl,
  displayName,
  username,
}: SidebarProps) => {
  // 현재 경로로 활성 메뉴 표시 (Client 훅)
  const pathname = usePathname();

  return (
    <aside className='hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex'>
      {/* 로고 */}
      <div className='flex h-16 items-center px-5'>
        <Link href='/dashboard' className='text-lg font-bold text-primary'>
          page0127
        </Link>
      </div>

      {/* 메뉴 */}
      <nav className='flex-1 space-y-1 px-3 py-2'>
        {navItems.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className='size-4' />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 하단: 알림 + 프로필 */}
      <div className='flex items-center justify-between border-t border-sidebar-border px-4 py-3'>
        <ProfileDropdown
          photoUrl={photoUrl}
          displayName={displayName}
          username={username}
        />
        <NotificationDropdown userId={userId} />
      </div>
    </aside>
  );
};
```

> 참고: `ProfileDropdown`/`NotificationDropdown`의 실제 props가 다르면 [ProfileDropdown.tsx](../../../apps/page0127/src/features/profile/ui/ProfileDropdown.tsx)·[HeaderClient.tsx](../../../apps/page0127/src/widgets/Header/ui/HeaderClient.tsx) 시그니처에 맞춰 조정.

- [ ] **Step 2: 타입체크**

Run: `npm run type-check`
Expected: 통과.

- [ ] **Step 3: 커밋**

```bash
git add apps/page0127/src/widgets/AppShell/ui/Sidebar.tsx
git commit -m "✨ Feat: 데스크톱 좌측 Sidebar 추가"
```

---

### Task 5: BottomTabBar (모바일, Client)

**Files:**
- Create: `apps/page0127/src/widgets/AppShell/ui/BottomTabBar.tsx`

- [ ] **Step 1: BottomTabBar 작성**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import { isNavItemActive, navItems } from '../model/navItems';

export const BottomTabBar = () => {
  const pathname = usePathname();

  // 모바일 하단 탭바는 핵심 항목(primary)만 노출
  const items = navItems.filter((item) => item.primary);

  return (
    <nav className='fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card md:hidden'>
      {items.map((item) => {
        const active = isNavItemActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className='size-5' />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};
```

- [ ] **Step 2: 타입체크**

Run: `npm run type-check`
Expected: 통과.

- [ ] **Step 3: 커밋**

```bash
git add apps/page0127/src/widgets/AppShell/ui/BottomTabBar.tsx
git commit -m "✨ Feat: 모바일 하단 BottomTabBar 추가"
```

---

### Task 6: AppShell 컴포지션 (Server) + re-export

**Files:**
- Create: `apps/page0127/src/widgets/AppShell/ui/AppShell.tsx`
- Create: `apps/page0127/src/widgets/AppShell/index.ts`

- [ ] **Step 1: AppShell 작성**

기존 [Header.tsx](../../../apps/page0127/src/widgets/Header/ui/Header.tsx)의 인증·프로필 조회 로직을 그대로 가져온다.

```tsx
import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getProfile } from '@/entities/profile/api/getProfile';

import { BottomTabBar } from './BottomTabBar';
import { Sidebar } from './Sidebar';

// 보호된 영역의 앱 셸 (Server Component)
// - 인증·프로필 데이터를 한 번 가져와 Client 네비게이션에 내려준다
export const AppShell = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getProfile(user.id);

  return (
    <div className='flex min-h-screen'>
      <Sidebar
        userId={user.id}
        photoUrl={profile?.photo_url ?? null}
        displayName={profile?.nickname || profile?.email || '사용자'}
        username={profile?.username ?? null}
      />
      {/* 모바일 하단 탭바 높이만큼 pb 확보 */}
      <main className='flex-1 pb-16 md:pb-0'>{children}</main>
      <BottomTabBar />
    </div>
  );
};
```

> 참고: `getProfile` 반환 타입의 필드명(`photo_url`/`nickname`/`username`/`email`)은 기존 Header가 쓰던 것과 동일하다. 다르면 [getProfile](../../../apps/page0127/src/entities/profile/api/getProfile.ts)에 맞춰 조정.

- [ ] **Step 2: index.ts 작성**

```typescript
export { AppShell } from './ui/AppShell';
```

- [ ] **Step 3: 타입체크**

Run: `npm run type-check`
Expected: 통과.

- [ ] **Step 4: 커밋**

```bash
git add apps/page0127/src/widgets/AppShell/ui/AppShell.tsx apps/page0127/src/widgets/AppShell/index.ts
git commit -m "✨ Feat: AppShell(Server) 컴포지션 추가"
```

---

### Task 7: (protected) 레이아웃 교체

**Files:**
- Modify: `apps/page0127/app/(protected)/layout.tsx`

- [ ] **Step 1: 레이아웃을 AppShell로 교체**

기존 인증 체크는 AppShell이 담당하므로 레이아웃은 셸 래핑만 한다.

```tsx
import { AppShell } from '@/widgets/AppShell';

/**
 * 보호된 페이지 레이아웃 (로그인 필수)
 *
 * 학습 포인트:
 * - 인증 체크와 네비게이션을 AppShell(Server Component)에 위임
 * - 레이아웃은 셸로 children을 감싸기만 한다
 */
const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  return <AppShell>{children}</AppShell>;
};

export default ProtectedLayout;
```

- [ ] **Step 2: 타입체크·린트**

Run: `npm run type-check && npm run lint`
Expected: 통과.

- [ ] **Step 3: dev 서버 육안 확인 (데스크톱 + 모바일)**

Run: `npm run dev`
확인:
- 데스크톱: 좌측 인디고 사이드바, 활성 메뉴 하이라이트, 하단 프로필/알림 동작
- 모바일(브라우저 좁히기/반응형 모드): 사이드바 숨김 + 하단 탭바 노출, 콘텐츠가 탭바에 안 가림
- 로그아웃 상태에서 `/dashboard` 접근 시 `/login` 리디렉션 유지
- 알림 드롭다운·프로필 드롭다운 기능 정상
→ 사용자 확인 대기.

- [ ] **Step 4: 커밋**

```bash
git add "apps/page0127/app/(protected)/layout.tsx"
git commit -m "♻️ Refactor: (protected) 레이아웃을 Header에서 AppShell로 교체"
```

---

### Task 8: 기존 Header 정리 판단

**Files:**
- (조건부) Delete: `apps/page0127/src/widgets/Header/`

- [ ] **Step 1: Header 잔존 사용처 확인**

Run (apps/page0127에서):
```bash
grep -rn "widgets/Header\|from '@/widgets/Header'" src app | grep -v node_modules
```
Expected: 결과 확인.
- **0건이면** → Step 2로 (삭제)
- **남아 있으면** (예: 공개 레이아웃 `(public)`이 Header 사용) → 삭제하지 말고 그대로 둔다. 이 경우 Task 종료(커밋 없음)하고 사용자에게 보고.

- [ ] **Step 2: (사용처 0건일 때만) Header 위젯 삭제**

```bash
git rm -r apps/page0127/src/widgets/Header
npm run type-check
```
Expected: type-check 통과(미사용 import 에러 없음).

- [ ] **Step 3: 커밋**

```bash
git commit -m "🔥 Remove: 미사용 Header 위젯 제거 (AppShell로 대체)"
```

---

## Self-Review (작성자 점검 완료)

- **Spec 커버리지:** 2절(토큰)→Task1·2, 3절(그림자·반경: globals 토큰에 반영)→Task1, 4절(셸)→Task3-7, 5절 1·2단계→본 계획, 3단계→별도 계획으로 명시. ✓
- **플레이스홀더:** 없음. 모든 코드 스텝에 실제 코드 포함. ✓
- **타입 일관성:** `navItems`/`isNavItemActive`가 Task3에서 정의되고 Task4·5에서 동일 시그니처로 사용. `Sidebar` props(userId/photoUrl/displayName/username)가 Task4 정의 = Task6 AppShell 전달과 일치. ✓
- **미해결 가정:** `ProfileDropdown`/`NotificationDropdown`/`getProfile` 시그니처는 기존 Header에서 검증된 것을 재사용 — 각 Task에 "다르면 조정" 주석 명시. ✓
