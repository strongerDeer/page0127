import { NextResponse } from 'next/server';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { createClient } from '@/shared/config/supabase/server';
import {
  extractOwnedProfileImagePath,
  PROFILE_STORAGE_BUCKET,
} from '@/shared/lib/profileStorage';

/**
 * 계정 삭제 API
 *
 * DELETE /api/auth/account
 *
 * 설계: docs/superpowers/specs/2026-07-23-account-deletion-fix-design.md
 *
 * 핵심: auth.users 행 하나만 삭제하면 DB의 FK(ON DELETE CASCADE / SET NULL)가
 *       딸린 데이터를 단일 트랜잭션으로 전부 정리한다.
 *   - CASCADE(함께 삭제): books, activities, notifications, follows,
 *     taste_analyses, book_recommendations(← taste_analyses),
 *     compatibility_analyses, mutual_recommendations(← compatibility_analyses),
 *     book_likes, ai_usage_logs, profiles ...
 *   - SET NULL(작성자만 비움, 글은 보존): comments.user_id, activity_comments.user_id
 *     → 다른 사람 글에 단 댓글은 "탈퇴한 사용자"로 남겨 대화 맥락을 지킨다.
 *
 * 인증은 쿠키 세션으로 "본인"만 확인하고, 실제 삭제는 RLS를 넘는 service_role(admin)로
 * 수행한다. DB 밖 자원인 Storage 프로필 이미지만 애플리케이션에서 직접 정리한다.
 */

export async function DELETE() {
  try {
    // 1. 쿠키 세션으로 본인 확인 (자기 계정만 삭제 가능)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 2. RLS를 넘어 auth.users를 지울 수 있는 admin 클라이언트
    const admin = createAdminClient();

    // 3. 삭제 "전에" 프로필 이미지 경로를 확보한다.
    //    profiles 행은 4단계 CASCADE로 함께 사라지므로 지금 읽어둬야 한다.
    const { data: profile } = await admin
      .from('profiles')
      .select('photo_url')
      .eq('id', user.id)
      .single();

    // 4. auth.users 삭제 → DB가 CASCADE로 딸린 데이터 전부 삭제 + 댓글 SET NULL
    //    두 번째 인자를 생략하면 하드 삭제(soft delete 아님)라 완전히 제거된다.
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(
      user.id
    );

    if (deleteUserError) {
      console.error('❌ 계정(auth.users) 삭제 실패:', deleteUserError);
      // 실패 시 "삭제됨" 응답 금지 — 데이터는 아직 그대로 남아 있다.
      return NextResponse.json(
        { error: '계정 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 500 }
      );
    }

    // 5. DB 밖 자원인 Storage 프로필 이미지 정리 (best-effort)
    //    계정은 이미 삭제됐으므로, 이미지 정리에 실패해도 성공(200)으로 본다.
    if (profile?.photo_url) {
      const filePath = extractOwnedProfileImagePath(profile.photo_url, user.id);
      if (filePath) {
        const { error: storageError } = await admin.storage
          .from(PROFILE_STORAGE_BUCKET)
          .remove([filePath]);

        if (storageError) {
          console.error(
            '프로필 이미지 삭제 실패(계정은 이미 삭제됨):',
            storageError
          );
        }
      }
    }

    return NextResponse.json(
      { message: '계정이 삭제되었습니다.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('계정 삭제 중 오류:', error);
    return NextResponse.json(
      { error: '계정 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
