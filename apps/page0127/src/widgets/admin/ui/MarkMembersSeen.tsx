'use client';

import { useEffect } from 'react';

import { usePathname } from 'next/navigation';

import { markMembersSeen } from '../api/markAdminSeen';

/**
 * 회원 관리 목록(/admin/members)을 열면 "확인함"으로 남긴다.
 * 회원 관리 페이지 파일을 건드리지 않으려고 레이아웃에 두고 주소로 판단한다.
 * 상세(/admin/members/[id])는 목록을 본 게 아니라서 세지 않는다.
 */
export const MarkMembersSeen = () => {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/admin/members') return;
    // 서버 액션이 revalidatePath 를 부르면 라우터가 현재 화면을 새로 받아 배지가 바로 0이 된다
    void markMembersSeen();
  }, [pathname]);

  return null;
};
