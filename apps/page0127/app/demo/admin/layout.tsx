import { DemoAdminShell } from '@/widgets/demo-admin';
import { assertDemoViewer } from '@/widgets/demo-admin/api/assertDemoViewer';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * 체험 계정용 데모 어드민 — 실제 운영 콘솔과 같은 패널에 예시 숫자를 넣어 보여 준다.
 * 실제 (admin) 레이아웃·assertAdmin 은 건드리지 않고 옆에 따로 둔다.
 * 이 폴더는 DB·GA 를 부르면 안 된다(app/demo-admin-imports.test.ts 가 지킨다).
 */
export default async function DemoAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await assertDemoViewer();
  return <DemoAdminShell>{children}</DemoAdminShell>;
}

export const metadata: Metadata = {
  title: '운영 화면 구경 (예시 데이터)',
  robots: { index: false, follow: false },
};
