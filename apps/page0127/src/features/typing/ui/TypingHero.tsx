'use client';

import { useEffect, useState } from 'react';

import s from './TypingHero.module.css';

/**
 * 온라인 필사 표지 — 이벤트 페이지 느낌(HJ 2026-11-26, B안 "표지만 이벤트풍").
 *
 * 1. 파란 원문 줄(흐린 글자)이 먼저 깔리고, 그 위를 한글 자판으로 치듯 한 글자씩 덮어 쓴다.
 *    글자마다 초성 → 초성+중성 → 완성 순서로 조합돼, 옛 타자 연습의 "쳐지는" 느낌을 낸다.
 * 2. LCD 계기판의 타수가 치는 만큼 올라가 목표에 닿는다.
 * 3. 다 치면 도트 그림이 하나씩 떠오르고, 설명·시작 버튼이 나타난다.
 *
 * 검색·스크린 리더용 제목은 h1 안 sr-only 로 처음부터 온전히 있고, 움직이는 글자는 aria-hidden.
 * 움직임 줄이기 설정이면 처음부터 다 친 상태로 보인다.
 */

const TITLE = '『어린 왕자』 온라인 필사';
const GOAL = 300;

const INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

/** 한 글자를 치는 동안 화면에 보이는 단계들 — "왕" → ["ㅇ", "와", "왕"] */
const stagesOf = (ch: string): string[] => {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return [ch];
  const l = Math.floor(code / 588);
  const t = code % 28;
  const lv = String.fromCharCode(0xac00 + code - t);
  return t ? [INITIALS[l], lv, ch] : [INITIALS[l], ch];
};

/** 제목 전체를 치는 프레임 — 프레임마다 화면에 보일 문자열 */
const FRAMES: string[] = (() => {
  const frames: string[] = [];
  let done = '';
  for (const ch of TITLE) {
    for (const stage of stagesOf(ch)) frames.push(done + stage);
    done += ch;
  }
  return frames;
})();

/** 떠오르는 도트 그림 — 어린 왕자 초상은 홍보·장식에 쓰지 않는다(HJ) */
const FLOATERS = [
  { name: 'fox', w: 246, h: 167, pos: s.f1 },
  { name: 'baobab', w: 350, h: 284, pos: s.f2 },
  { name: 'sheep', w: 236, h: 208, pos: s.f3 },
  { name: 'lamplighter', w: 216, h: 312, pos: s.f4 },
  { name: 'well', w: 300, h: 209, pos: s.f5 },
  { name: 'king', w: 212, h: 283, pos: s.f6 },
] as const;

const STEP_MS = 85;
const START_DELAY_MS = 450;

export const TypingHero = ({ targetId }: { targetId: string }) => {
  // -1 = 아직 시작 전(원문 줄만 보임)
  const [frame, setFrame] = useState(-1);
  const last = FRAMES.length - 1;
  const done = frame >= last;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFrame(last);
      return;
    }
    let i = -1;
    let timer = window.setTimeout(function tick() {
      i += 1;
      setFrame(i);
      // 띄어쓰기·낫표 다음엔 살짝 쉬어 사람이 치는 박자를 낸다
      const pause = /[ 』]$/.test(FRAMES[i]) ? STEP_MS * 3 : 0;
      if (i < last) timer = window.setTimeout(tick, STEP_MS + pause);
    }, START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [last]);

  const typed = frame < 0 ? '' : FRAMES[frame];
  const strokes = Math.round(GOAL * ((frame + 1) / FRAMES.length));

  const scrollToRoom = () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className={s.hero} data-done={done || undefined}>
      <div className={s.floaters} aria-hidden>
        {FLOATERS.map((f, idx) => (
          // eslint-disable-next-line @next/next/no-img-element -- 장식용 정적 webp
          <img
            key={f.name}
            src={`/typing/pixel/${f.name}.webp`}
            width={f.w}
            height={f.h}
            alt=''
            className={`${s.floater} ${f.pos}`}
            style={{ animationDelay: `${idx * 140}ms, ${idx * 140 + 600}ms` }}
            decoding='async'
          />
        ))}
      </div>

      <p className={s.badge}>
        <span className={s.badgeDot} aria-hidden />
        타자 연습을 겸한
        <strong>온라인 필사</strong>
      </p>

      <h1 className={s.title}>
        <span className='sr-only'>{TITLE}</span>
        <span className={s.lines} aria-hidden>
          {/* 원문 줄 — 흐린 파란 글자, 자리를 미리 잡아 둬 글자가 늘어나도 줄이 흔들리지 않는다 */}
          <span className={s.source}>{TITLE}</span>
          <span className={s.typed}>
            {typed}
            <span className={s.caret} />
          </span>
        </span>
      </h1>

      <div className={s.meters} aria-hidden>
        <span className={s.lcd}>
          <small>타수</small>
          <b>{String(Math.max(0, strokes)).padStart(3, '0')}</b>
        </span>
        <span className={s.lcd}>
          <small>정확도</small>
          <b>100%</b>
        </span>
      </div>

      <div className={s.after}>
        <p className={s.desc}>
          그때 그 타자 연습처럼, 이번엔 필사로. 파란 줄을 보고 바로 아래에
          똑같이 따라 쳐 보세요. 명문장 한 대목부터 가볍게 시작하고, 처음부터
          이어 써도, 장을 골라 써도 좋아요.
        </p>
        <button type='button' className={s.cta} onClick={scrollToRoom}>
          필사 시작하기
          <span aria-hidden>↓</span>
        </button>
      </div>
    </section>
  );
};
