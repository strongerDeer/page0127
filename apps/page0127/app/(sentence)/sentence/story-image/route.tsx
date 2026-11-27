import { createAdminClient } from '@/shared/config/supabase/admin';
import { renderOg } from '@/shared/lib/og/render';
import { SentenceStoryCard } from '@/shared/lib/og/SentenceStoryCard';
import { STORY_SIZE } from '@/shared/lib/og/theme';

import {
  commentFor,
  formatSentenceSource,
  isDailyScoreTotal,
} from '@/entities/daily-sentence';

import type { DailySentence } from '@/entities/daily-sentence';

// 오늘의 문장 스토리 이미지 (1080×1920) — /sentence 결과 화면(랜딩·모달)의 공유 버튼이 받아 간다.
//
// GET /sentence/story-image?id=<문장 uuid>&score=<70~99>&d=<YYYY-MM-DD>   (HJ A안, 2026-11-27)
//
// 왜 주소에 "문장 번호 + 점수"인가
// - 비회원도 공유한다 → 쿠키로 "누가 뽑았는지"를 알 수 없다. 그림에 필요한 것을 주소가 들고 와야 한다.
// - 문장 **글자**는 주소에 담지 않는다. 담으면 누구나 아무 글이나 넣어 page0127. 로고가 찍힌 그림을 만든다.
//   번호(uuid)만 받고 글자는 서버가 문장 풀에서 읽는다 → 운영에서 끈 문장(is_active=false)은 그림도 안 나온다.
// - 점수는 주소를 고치면 바뀌지만, 70~99 안의 정수만 받는다(isDailyScoreTotal) — 꾸며 봐야 운세 숫자 하나다.
//   점수의 한 줄(comment)도 서버가 점수로 다시 고른다.
//
// 왜 관리자(service_role) 클라이언트인가: daily_sentences 는 RLS 로 잠겨 있다(내가 뽑은 문장만).
// 표를 열거나 새 공개 함수를 만들지 않고(마이그레이션 X), 이 라우트가 "켜진 문장 한 줄의 공개 칸"만 꺼낸다.
// rights_note 같은 운영 칸은 읽지 않는다.
//
// 캐시: 같은 주소면 늘 같은 그림이라 공개 캐시(renderOg 기본 1시간)에 올린다.
// runtime 을 지정하지 않는다 = Node.js 런타임 (next/og 번들이 Edge 한도를 넘는다 — theme.ts).

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const notFound = () => new Response('없는 문장', { status: 404 });

/** 'YYYY-MM-DD' → '11월 27일' */
const toDateLabel = (dateKey: string) =>
  `${Number(dateKey.slice(5, 7))}월 ${Number(dateKey.slice(8, 10))}일`;

export const GET = async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const id = params.get('id') ?? '';
  const score = Number(params.get('score'));
  const date = params.get('d') ?? '';

  if (
    !UUID_PATTERN.test(id) ||
    !isDailyScoreTotal(score) ||
    !DATE_PATTERN.test(date)
  ) {
    return new Response('잘못된 요청', { status: 400 });
  }

  try {
    const { data: sentence } = await createAdminClient()
      .from('daily_sentences')
      .select('text, book_title, author, translator, page')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle<
        Pick<
          DailySentence,
          'text' | 'book_title' | 'author' | 'translator' | 'page'
        >
      >();
    if (!sentence) return notFound();

    return renderOg(
      <SentenceStoryCard
        dateLabel={toDateLabel(date)}
        text={sentence.text}
        source={formatSentenceSource(sentence)}
        score={score}
        comment={commentFor(score)}
      />,
      STORY_SIZE
    );
  } catch (error) {
    console.error('오늘의 문장 스토리 이미지 조회 실패:', error);
    return new Response('조회 실패', { status: 500 });
  }
};
