import { NextResponse } from 'next/server';

import { createClient } from '@/shared/config/supabase/server';

/**
 * 계정 삭제 API
 *
 * DELETE /api/auth/account
 *
 * 처리 순서:
 * 1. 사용자 인증 확인
 * 2. 댓글 작성자를 NULL로 변경 (커뮤니티 보호)
 *    - 다른 사람 글에 단 댓글은 삭제하지 않고 유지
 *    - user_id를 NULL로 설정하여 "탈퇴한 사용자"로 표시
 * 3. 관련 데이터 삭제 (CASCADE로 자동 삭제됨)
 *    - reading_records (내 독서 기록)
 *    - activities (내가 올린 피드/활동 - 완전 삭제)
 *    - taste_analysis_results (AI 분석 결과)
 *    - book_recommendations (추천 도서)
 *    - notifications (알림)
 *    - follows (팔로우/팔로워)
 *    - likes (내가 누른 좋아요)
 * 4. Supabase Storage 프로필 이미지 삭제
 * 5. profiles 테이블에서 삭제
 * 6. Supabase Auth 사용자 삭제 (TODO: Edge Function 필요)
 *
 * 중요: 내가 작성한 주체 콘텐츠(피드/활동)는 완전 삭제,
 *       다른 사람 글에 대한 반응(댓글)만 "탈퇴한 사용자"로 보존
 */
export async function DELETE() {
  try {
    const supabase = await createClient();

    // 1. 현재 로그인한 사용자 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 2. 댓글 작성자를 NULL로 변경 (커뮤니티 보호)
    // comments 테이블의 user_id를 NULL로 설정하여 "탈퇴한 사용자"로 표시
    const { error: commentUpdateError } = await supabase
      .from('comments')
      .update({ user_id: null })
      .eq('user_id', user.id);

    if (commentUpdateError) {
      console.error('댓글 업데이트 실패:', commentUpdateError);
      // 댓글 업데이트 실패해도 계정 삭제는 계속 진행
    }

    // 3. 프로필 정보 조회 (이미지 삭제용)
    const { data: profile } = await supabase
      .from('profiles')
      .select('photo_url')
      .eq('id', user.id)
      .single();

    // 4. Supabase Storage에서 프로필 이미지 삭제
    if (profile?.photo_url) {
      try {
        // URL에서 파일 경로 추출
        let filePath: string | null = null;

        if (profile.photo_url.includes('/storage/v1/object/public/profiles/')) {
          const urlParts = profile.photo_url.split(
            '/storage/v1/object/public/profiles/'
          );
          filePath = urlParts.length > 1 ? urlParts[1] : null;
        } else if (profile.photo_url.includes('/object/public/profiles/')) {
          const urlParts = profile.photo_url.split('/object/public/profiles/');
          filePath = urlParts.length > 1 ? urlParts[1] : null;
        } else if (profile.photo_url.includes('/profiles/')) {
          const urlParts = profile.photo_url.split('/profiles/');
          filePath = urlParts.length > 1 ? urlParts[1] : null;
        }

        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from('profiles')
            .remove([filePath]);

          if (storageError) {
            console.error('프로필 이미지 삭제 실패:', storageError);
            // 이미지 삭제 실패해도 계정 삭제는 계속 진행
          }
        }
      } catch (error) {
        console.error('Storage 삭제 중 오류:', error);
        // 오류가 발생해도 계정 삭제는 계속 진행
      }
    }

    // 4. 관련 데이터 명시적 삭제 (CASCADE가 auth.users 기준이므로)
    // 학습 포인트: 외래 키가 auth.users를 참조하지만 profiles만 삭제하므로 명시적 삭제 필요

    // books 삭제 (독서 데이터의 핵심)
    const { error: deleteBooksError } = await supabase
      .from('books')
      .delete()
      .eq('user_id', user.id);

    if (deleteBooksError) {
      console.error('❌ 도서 삭제 실패:', deleteBooksError);
    }

    // reading_records 삭제
    const { error: deleteReadingRecordsError } = await supabase
      .from('reading_records')
      .delete()
      .eq('user_id', user.id);

    if (deleteReadingRecordsError) {
      console.error('❌ 독서 기록 삭제 실패:', deleteReadingRecordsError);
    }

    // activities 삭제 (내가 올린 피드/활동)
    const { error: deleteActivitiesError } = await supabase
      .from('activities')
      .delete()
      .eq('user_id', user.id);

    if (deleteActivitiesError) {
      console.error('❌ 활동 삭제 실패:', deleteActivitiesError);
    }

    // 중요: activity_comments는 삭제하지 않음 (커뮤니티 보호)
    // 다른 사람 피드/활동에 단 댓글 보존 (대화 맥락 유지)
    // DB 제약조건(ON DELETE SET NULL)에 의해 user_id만 NULL로 자동 설정됨

    // activity_likes 삭제 (내가 누른 좋아요)
    const { error: deleteActivityLikesError } = await supabase
      .from('activity_likes')
      .delete()
      .eq('user_id', user.id);

    if (deleteActivityLikesError) {
      console.error('❌ 좋아요 삭제 실패:', deleteActivityLikesError);
    }

    // follows 삭제 (팔로우/팔로워)
    const { error: deleteFollowsError } = await supabase
      .from('follows')
      .delete()
      .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);

    if (deleteFollowsError) {
      console.error('❌ 팔로우 삭제 실패:', deleteFollowsError);
    }

    // notifications 삭제
    const { error: deleteNotificationsError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (deleteNotificationsError) {
      console.error('❌ 알림 삭제 실패:', deleteNotificationsError);
    }

    // taste_analyses 삭제 (AI 취향 분석)
    const { error: deleteTasteAnalysesError } = await supabase
      .from('taste_analyses')
      .delete()
      .eq('user_id', user.id);

    if (deleteTasteAnalysesError) {
      console.error('❌ 취향 분석 삭제 실패:', deleteTasteAnalysesError);
    }

    // compatibility_analyses 삭제 (호환성 분석)
    const { error: deleteCompatibilityAnalysesError } = await supabase
      .from('compatibility_analyses')
      .delete()
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    if (deleteCompatibilityAnalysesError) {
      console.error('❌ 호환성 분석 삭제 실패:', deleteCompatibilityAnalysesError);
    }

    // mutual_recommendations 삭제 (상호 추천)
    const { error: deleteMutualRecommendationsError } = await supabase
      .from('mutual_recommendations')
      .delete()
      .or(`to_user_id.eq.${user.id},from_user_id.eq.${user.id}`);

    if (deleteMutualRecommendationsError) {
      console.error(
        '❌ 상호 추천 삭제 실패:',
        deleteMutualRecommendationsError
      );
    }

    // book_recommendations 삭제 (도서 추천, author 컬럼 사용)
    const { error: deleteBookRecommendationsError } = await supabase
      .from('book_recommendations')
      .delete()
      .eq('author', user.id);

    if (deleteBookRecommendationsError) {
      console.error('❌ 도서 추천 삭제 실패:', deleteBookRecommendationsError);
    }

    // 중요: comments는 삭제하지 않음 (커뮤니티 보호)
    // DB 제약조건(ON DELETE SET NULL)에 의해 user_id만 NULL로 자동 설정됨

    // 5. profiles 테이블에서 삭제
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (deleteProfileError) {
      console.error('❌ 프로필 삭제 실패:', deleteProfileError);
      return NextResponse.json(
        { error: '계정 삭제에 실패했습니다.', details: deleteProfileError },
        { status: 500 }
      );
    }

    // 6. Supabase Auth 사용자 삭제
    // admin API를 사용하려면 서비스 역할 키가 필요하지만,
    // 일반적으로 사용자는 자신의 계정만 삭제 가능
    // Supabase는 profiles 삭제 후 자동으로 auth.users를 정리하지 않으므로
    // 별도 처리 필요할 수 있음 (Supabase Edge Function 활용 권장)
    //
    // 현재는 profiles만 삭제하고, auth.users는 Supabase 대시보드에서 수동 정리
    // 또는 Supabase Edge Function을 통해 admin.auth.deleteUser() 호출

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
