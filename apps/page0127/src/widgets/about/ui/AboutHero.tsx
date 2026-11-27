import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@repo/ui';

import { CarrotBookmark } from '@/features/daily-sentence';
import { ShareSheetButton } from '@/features/share';

import { BeltLink } from './BeltLink';
import { CoverArt } from './CoverArt';

import type { HomeMember } from '../model/member';
import type { HeroSlide } from '@/entities/banner/types';
import type { CSSProperties } from 'react';

import styles from './AboutHero.module.css';

type AboutHeroProps = {
  /** "내 책장 만들어 보기"가 갈 곳 — 홈에선 같은 페이지의 맛보기 장(#book-ch-first-impression) */
  startHref?: string;
  /** "어떻게 쓰나요?"가 갈 곳 */
  guideHref?: string;
  /** 로그인 사용자 — 있으면 버튼이 "내 서재로·서재 공유하기"로 바뀐다 */
  member?: HomeMember | null;
  /**
   * 어드민 배너 — 있으면 띠지 문구를 갈아 끼운다(제목=큰 문장, 설명=아랫줄, 띠지 전체가 링크).
   * 없으면 기본 띠지 문구. 예전엔 표지 위에 배너 칸이 따로 있어 표지를 화면 아래로 밀었다(2026-11-17).
   * 기념일 표지(2026-11-17 HJ): 슬라이드가 '기본 띠지'를 고르면 띠지는 기본 문구, '표지 갈아입히기'면
   * 앞표지 색·제목·그림까지 바뀐다(slide.cover).
   */
  belt?: HeroSlide | null;
};

// 표지 제목에서 돌아가는 단어. 스크린리더·검색엔진은 첫 단어로 고정된 문장을 읽는다.
const ROLLING_WORDS = ['취향을', '계절을', '마음을'] as const;

/**
 * 홈 첫 화면 — 책상 위에 놓인 책 한 권(2026-11-17 HJ "홈을 한 권의 책으로" ① 표지·펼침)
 *
 * 표지가 곧 히어로다. 제목(h1)은 표지 위의 진짜 글자라 서버 HTML 에 그대로 있다.
 * 스크롤하면 표지가 왼쪽으로 열리고 책 속으로 들어가 첫 쪽이 1장이 된다(홈에선 HomeBook 이 data-cover-* 를 움직인다).
 *
 * 성능 원칙 (HJ "최대한 성능 고려")
 * - 서버 컴포넌트. 홈의 책 모드에선 HomeBook 이 펼침·확대를 맡고, 그 밖(책 모드 전·다른 페이지)에선
 *   CSS 스크롤 연동 애니메이션(animation-timeline)으로 표지만 연다. 동작 줄이기에선 덮인 표지로 멈춰 있다.
 * - 웹폰트는 띠지 명조 서브셋 6.8KB 하나(앞·뒤 띠지 문장 27자만 담음 — 기기 명조는 기기마다 모양이 달라 고정).
 * - 이미지 1장: 앱 아이콘 96px WebP(3KB). 표지 질감·그림자·바코드는 전부 CSS.
 * - 표지 장식(0127. 음각·띠지·책갈피)은 aria-hidden — 읽는 순서는 제목 → 부제 → 버튼.
 */
export const AboutHero = ({
  startHref = '/',
  guideHref = '#steps',
  member = null,
  belt = null,
}: AboutHeroProps) => {
  const cover = belt?.cover.style === 'custom' ? belt.cover : null;
  const customBelt = belt?.beltStyle === 'custom' ? belt : null;
  // 표지·책갈피·0127. 음각이 모두 --cover 를 쓰므로 변수만 바꾸면 함께 갈아입는다
  const frontStyle = cover
    ? ({ '--cover': cover.bg, '--cover-ink': cover.fg } as CSSProperties)
    : undefined;

  return (
    <section aria-labelledby='about-title' className={styles.desk}>
      <div className={styles.stage}>
        <div data-cover-book='' className={styles.book}>
          {/* 책 몸통: 종이 단면(오른쪽·아래)과 표지 안쪽의 첫 쪽 */}
          <div aria-hidden='true' className={styles.pagesBottom} />
          <div aria-hidden='true' className={styles.pagesEdge} />
          <div aria-hidden='true' data-cover-leaf='' className={styles.leaf}>
            <span className={styles.leafChapter}>제1장</span>
            <span className={styles.leafTitle}>왜 page0127.인가요</span>
          </div>

          {/* 오늘의 문장 입구 — 책장 사이에 꽂힌 당근(HJ 2026-11-24). 표지(lid)보다 먼저 그려 표지 뒤에 깔린다 */}
          <CarrotBookmark />

          <div data-cover-lid='' className={styles.cover}>
            <div className={styles.front} style={frontStyle}>
              {cover?.art && <CoverArt art={cover.art} />}
              {(!cover || cover.showNumber) && (
                <span aria-hidden='true' className={styles.bigNum}>
                  0127<i>.</i>
                </span>
              )}
              <div className={styles.titleRow}>
                <h1 id='about-title' className={styles.title}>
                  {cover?.title ? (
                    // 기념일 제목은 눈에만 바꾼다 — 검색엔진·스크린리더는 서비스 소개 문장을 그대로 읽는다
                    <>
                      <span className='sr-only'>
                        읽은 책을 꽂아 두면, 책장이 {ROLLING_WORDS[0]} 말해
                        줍니다
                      </span>
                      <span aria-hidden='true' className={styles.customTitle}>
                        {cover.title}
                      </span>
                    </>
                  ) : (
                    <>
                      읽은 책을 꽂아 두면,
                      <br />
                      책장이 <span className='sr-only'>{ROLLING_WORDS[0]}</span>
                      <span aria-hidden='true' className={styles.roll}>
                        {[...ROLLING_WORDS, ROLLING_WORDS[0]].map((w, i) => (
                          <span key={i}>{w}</span>
                        ))}
                      </span>{' '}
                      말해 줍니다
                    </>
                  )}
                </h1>
                {/* 출판사 마크 자리 — 작게, 정면으로. unoptimized: 이미 96px WebP(3KB)라
                  이미지 변환 함수를 거칠 필요가 없다(Vercel 이미지 변환·CPU 절약) */}
                <Image
                  src='/brand/app-icon-96.webp'
                  alt=''
                  width={48}
                  height={48}
                  unoptimized
                  className={styles.mark}
                />
              </div>
              <p className={styles.subtitle}>읽은 책이 쌓여 책장이 됩니다</p>

              {/* 띠지 — 실제 책처럼 표지 아래를 감싸는 종이 띠. 숫자 아랫단을 살짝 가린다.
                어드민 배너가 있으면 그 문구로 갈아 끼우고 띠지가 링크가 된다 */}
              {customBelt ? (
                <BeltLink
                  slideId={customBelt.id}
                  href={customBelt.href}
                  cta={customBelt.cta}
                  className={`${styles.belt} ${styles.beltLink} ${styles.beltCustom}`}
                  style={
                    {
                      '--belt': customBelt.bg,
                      '--belt-ink': customBelt.fg,
                    } as CSSProperties
                  }
                >
                  {customBelt.beltArt && (
                    // 띠지 배경 그림 — 높이 꽉 차게·오른쪽 붙임, 왼쪽 끝은 띠지 색으로 흐린다.
                    // 장식이라 alt 는 비운다(문구가 링크 이름). 이미 600px WEBP 라 변환 없이 쓴다
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={customBelt.beltArt}
                      alt=''
                      decoding='async'
                      className={styles.beltArt}
                    />
                  )}
                  <span className={styles.beltEyebrow}>
                    {customBelt.eyebrow}
                  </span>
                  {/* 배너 문구는 그때그때 바뀌어 띠지 명조 서브셋에 글자가 없다 → 본문 고딕 */}
                  <span className={styles.beltHeadSans}>
                    {customBelt.lines[0]}
                    <br />
                    {customBelt.lines[1]}
                  </span>
                  <span className={styles.beltFoot}>
                    {customBelt.sub} <span aria-hidden='true'>→</span>
                  </span>
                  <i aria-hidden='true' className={styles.bookmark} />
                </BeltLink>
              ) : (
                <div aria-hidden='true' className={styles.belt}>
                  <span className={styles.beltEyebrow}>
                    2026 독서 기록 서비스
                  </span>
                  <span className={styles.beltHead}>
                    “읽은 책이 쌓이면,
                    <br />
                    책장이 나를 소개한다”
                  </span>
                  <span className={styles.beltFoot}>
                    한 권을 꽂는 순간, 당신의 서재가 시작됩니다
                  </span>
                  <i className={styles.bookmark} />
                </div>
              )}
            </div>
            {/* 표지 안쪽(면지) — 펼치면 보인다 */}
            <div aria-hidden='true' className={styles.endpaper} />
          </div>
        </div>

        <div data-cover-cta='' className={styles.cta}>
          <p className={styles.lead}>
            한 권 꽂는 데 10초, 평가한 완독 책 다섯 권이 모이면 취향 노트가
            나와요.
          </p>
          <div className='flex flex-wrap justify-center gap-2.5'>
            {member ? (
              // 이미 서재가 있는 사람 — 체험 대신 자기 책장으로, 그리고 자랑하러
              <>
                <Button asChild size='lg'>
                  <Link href={`/${member.username}`}>내 서재로</Link>
                </Button>
                <ShareSheetButton
                  path={`/${member.username}`}
                  imagePath={`/${member.username}/story-image`}
                  fileName={`page0127-${member.username}.png`}
                  title={`${member.displayName}님의 책장`}
                  sheetTitle='서재 공유하기'
                  triggerLabel='서재 공유하기'
                  prominent
                />
              </>
            ) : (
              <>
                {/* 로그인으로 바로 보내지 않는다 — 고르고 책장이 서는 체험은 홈에 있다 */}
                <Button asChild size='lg'>
                  <Link href={startHref}>내 책장 만들어 보기</Link>
                </Button>
                <Button asChild size='lg' variant='secondary'>
                  <Link href={guideHref}>어떻게 쓰나요?</Link>
                </Button>
              </>
            )}
          </div>
          <p aria-hidden='true' className={styles.hint}>
            <span className={styles.hintFine}>
              스크롤하거나 → 키를 누르면 책이 펼쳐져요
            </span>
            <span className={styles.hintTouch}>위로 밀면 책이 펼쳐져요</span>
          </p>
        </div>
      </div>
    </section>
  );
};
