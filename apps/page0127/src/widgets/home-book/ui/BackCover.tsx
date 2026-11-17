import Link from 'next/link';

import { Button } from '@repo/ui';

import { OAuthLoginButtons } from '@/features/auth/ui/OAuthLoginButtons';

import styles from './BackCover.module.css';

type BackCoverProps = {
  /** 로그인 사용자 — 있으면 가입 버튼 대신 "책 꽂으러 가기·내 서재로" */
  member?: { username: string } | null;
};

/**
 * 책의 끝 — 다 읽은 책을 덮어 책상 위에 뒤집어 둔 뒤표지. 뒤표지가 곧 홈의 마무리다 (시안 v9)
 *
 * 서버 컴포넌트. 마지막 장(라운지)을 끝까지 넘기면 HomeBook 이 그 장을 복제해 이 책의 앞면(data-back-front)에
 * 넣고, 화면 가득한 크기에서 책 크기로 줄인 뒤 뒤집는다 → 뒷면의 맺음 문장이 보이고, 책 아래에
 * 가입 버튼이 떠오른다. 예전처럼 버튼 있는 맺음 장을 따로 두고 그걸 뒤집어 날리지 않는다(HJ "UI 를 뒤표지로").
 *
 * - JS 가 없거나 동작 줄이기면 책은 처음부터 뒤집혀(뒷면이 보이게) 놓여 있고 버튼도 그대로 보인다.
 * - 맺음 문장(h2)은 진짜 글자, 띠지·바코드는 장식(aria-hidden).
 * - 띠지 명조는 앞표지와 같은 서브셋 글꼴(AboutHero.module.css 의 @font-face, 앞·뒤 띠지 문장 글자를 함께 담음).
 * - "처음부터 다시 펼치기"는 맨 위로 가는 앵커 — JS 가 있으면 HomeBook 이 표지로 부드럽게 올린다.
 */
export const BackCover = ({ member = null }: BackCoverProps) => (
  <div id='book-back' data-book-page='back' className={styles.wrap}>
    <section aria-labelledby='book-back-title' className={styles.desk}>
      <div data-back-book='' className={styles.book}>
        <div data-back-flip='' className={styles.flip}>
          {/* 앞면 — 덮이기 직전의 마지막 장이 여기 들어온다(HomeBook 이 복제해 넣음) */}
          <div aria-hidden='true' data-back-front='' className={styles.front} />

          <div className={styles.back}>
            <h2 id='book-back-title' className={styles.title}>
              오늘 읽은 한 권부터 꽂아 보세요.
            </h2>
            <p aria-hidden='true' className={styles.imprint}>
              page0127.
            </p>

            {/* 앞표지 띠지가 책등을 돌아 뒤까지 이어진다 */}
            <div aria-hidden='true' className={styles.belt}>
              <div className={styles.beltText}>
                <span className={styles.beltEyebrow}>
                  이 책을 덮은 당신에게
                </span>
                <span className={styles.beltHead}>
                  “오늘 꽂은 한 권이
                  <br />
                  내년의 나를 말해 줍니다”
                </span>
                <span className={styles.beltFoot}>
                  서재는 한 권부터 시작됩니다
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 책상 위, 덮인 책 바로 아래 — 덮고 나면 떠오른다 */}
      <div data-back-cta='' className={styles.cta}>
        {member ? (
          <div className={styles.row}>
            <Button asChild size='lg'>
              <Link href='/books/add'>책 꽂으러 가기</Link>
            </Button>
            <Button asChild size='lg' variant='secondary'>
              <Link href={`/${member.username}`}>내 서재로</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className={styles.login}>
              {/* /dashboard 는 로그인 뒤 내 서재(/{username})로 보내는 기존 경로 — 코치 팁이 거기서 시작한다 */}
              <OAuthLoginButtons next='/dashboard' />
            </div>
            <p className={styles.checks}>
              <span>✓ 무료</span>
              <span>✓ 10초 가입</span>
              <span>✓ 언제든 탈퇴</span>
            </p>
          </>
        )}
        <a href='#top' data-book-restart='' className={styles.again}>
          처음부터 다시 펼치기 <span aria-hidden='true'>↺</span>
        </a>
      </div>
    </section>
  </div>
);
