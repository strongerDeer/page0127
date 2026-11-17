'use client';

import { useEffect, useRef } from 'react';

import type { BookChapter } from '../model/chapters';

import styles from './HomeBook.module.css';

type HomeBookProps = {
  chapters: BookChapter[];
  /** 서버에서 그린 장들(<Chapter>) — 이 컴포넌트는 감싸기만 하고 내용은 건드리지 않는다 */
  children: React.ReactNode;
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

type Pt = [number, number];
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];

/** 다각형을 직선(점 M, 법선 n)으로 잘라 한쪽만 남긴다 */
const clipHalf = (poly: Pt[], M: Pt, n: Pt, keepNeg: boolean): Pt[] => {
  const out: Pt[] = [];
  const side = (p: Pt) => {
    const v = dot([p[0] - M[0], p[1] - M[1]], n);
    return keepNeg ? -v : v;
  };
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
};

/** 접는 선(M, n)에 대해 점을 뒤집는다 — 말려 올라간 종이 뒷면의 위치 */
const reflect = (p: Pt, M: Pt, n: Pt): Pt => {
  const d = 2 * dot([p[0] - M[0], p[1] - M[1]], n);
  return [p[0] - d * n[0], p[1] - d * n[1]];
};

const isTransparent = (c: string) =>
  !c || c === 'transparent' || /rgba?\(.*,\s*0\)$/.test(c);

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable ||
    Boolean(el.closest('input, textarea, select, [role="listbox"]')));

/**
 * 홈 "한 권의 책" — 장을 겹겹이 쌓고, 끝까지 읽은 장의 모서리를 말아 넘긴다 (② 장 넘김, HJ 시안 방식)
 *
 * 쪽 넘김의 좌표 (vb = 화면 아래 끝 = 창 높이 − 하단 탭바, gnb = 헤더 높이, T = 넘김 거리)
 * ① 쪽 i 는 sticky 다. top = min(gnb, vb − 쪽 높이) → 긴 장은 끝까지 읽은 순간(쪽 아랫변이 vb 에 닿을 때),
 *    짧은 장은 윗변이 헤더에 닿을 때 멈춘다. 그때의 스크롤 = pin[i].
 * ② 장 감싸개의 아래 여백이 T(--book-turn) 라서, 쪽 i 는 pin[i] ~ pin[i]+T 동안 멈춰 있다 → 이 구간이 넘김.
 * ③ 다음 장은 -(vb − gnb) 만큼 당겨져 앞 장 밑에 깔린다. 그러면 넘김이 끝나는 순간(pin[i]+T)
 *    다음 장 윗변이 정확히 헤더 아래에 온다 — 곧 "다음 장 앵커로 이동한 자리"와 같다.
 *    넘기는 동안엔 남은 거리(1−p)·T 만큼 위로 끌어올려 제자리에 가만히 있는 것처럼 보이게 한다.
 *
 * 성능
 * - 스크롤마다 rAF 한 번, 만지는 건 넘기고 있는 쪽 하나의 clip-path 와 그 밑 쪽의 transform 뿐.
 * - 말린 종이 뒷면·그림자는 화면 크기 캔버스 하나에 넘기는 동안만 그린다(멈춰 있으면 비운다).
 * - 동작 줄이기·JS 실패 → data-book 을 켜지 않아 쌓지 않고 평범하게 이어진다.
 */
export const HomeBook = ({ chapters, children }: HomeBookProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tocBtnRef = useRef<HTMLButtonElement>(null);
  const tocRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    if (!root || !cv || !ctx) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const wraps = [
      ...root.querySelectorAll<HTMLElement>('[data-book-chapter]'),
    ];
    const sheets = wraps.map((w) =>
      w.querySelector<HTMLElement>('[data-book-sheet]')
    );
    if (wraps.length < 2 || sheets.some((s) => !s)) return;
    const pages = sheets as HTMLElement[];

    root.dataset.book = 'on';

    let W = 0;
    let vh = 0;
    let vb = 0;
    let gnb = 64;
    let T = 0;
    let heights: number[] = [];
    let pins: number[] = [];
    let raf = 0;

    const docTop = (el: HTMLElement) =>
      el.getBoundingClientRect().top + scrollY;

    // 이 장을 "막 펼친 자리" — 첫 장은 윗변이 헤더 아래, 나머지는 앞 장 넘김이 끝난 자리
    const restOf = (k: number) =>
      k <= 0 ? docTop(wraps[0]) - gnb : pins[k - 1] + T;

    const measure = () => {
      vh = innerHeight;
      W = document.documentElement.clientWidth;
      gnb =
        document.querySelector('header')?.getBoundingClientRect().height ?? 64;
      const bar = document.querySelector<HTMLElement>('[data-bottom-bar]');
      const bottom =
        bar && getComputedStyle(bar).display !== 'none' ? bar.offsetHeight : 0;
      vb = vh - bottom;
      T = Math.round((vb - gnb) * 0.8);

      root.style.setProperty('--book-vh', `${vh}px`);
      root.style.setProperty('--book-gnb', `${gnb}px`);
      root.style.setProperty('--book-bottom', `${bottom}px`);
      root.style.setProperty('--book-turn', `${T}px`);

      wraps.forEach((w, i) => (w.style.zIndex = String(wraps.length - i)));
      heights = pages.map((s) => s.offsetHeight);
      pages.forEach((s, i) => {
        s.style.top = `${Math.min(gnb, vb - heights[i])}px`;
      });
      pins = wraps.map((w, i) => docTop(w) + heights[i] - vb);

      const dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = W * dpr;
      cv.height = vh * dpr;
      cv.style.width = `${W}px`;
      cv.style.height = `${vh}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    // 말린 뒷면 = 같은 종이의 뒷면이라 그 장 바탕색 그대로. 다크 모드 전환도 따라가게 그때그때 읽는다
    // (넘기는 쪽 하나만 프레임당 한 번 읽는다)
    const flapColor = (page: HTMLElement) => {
      const sec = page.querySelector('section');
      const c = sec ? getComputedStyle(sec).backgroundColor : '';
      return isTransparent(c) ? getComputedStyle(page).backgroundColor : c;
    };

    const path = (poly: Pt[]) => {
      ctx.beginPath();
      poly.forEach((p, i) =>
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])
      );
      ctx.closePath();
    };

    // 쪽 i 를 오른쪽 아래 모서리에서 e(0~1)만큼 말아 넘긴다 (시안 v9 과 같은 계산)
    const curl = (i: number, e: number) => {
      const page = pages[i];
      const offY = vb - heights[i]; // 멈춘 쪽의 윗변(화면 좌표, 긴 장이면 음수)
      const Cn: Pt = [W, vb];
      const P: Pt = [
        W - 2 * W * e,
        vb - (vb - gnb) * 0.3 * Math.sin(Math.PI * e),
      ];
      const dx = Cn[0] - P[0];
      const dy = Cn[1] - P[1];
      const len = Math.hypot(dx, dy) || 1;
      const n: Pt = [dx / len, dy / len];
      const M: Pt = [(Cn[0] + P[0]) / 2, (Cn[1] + P[1]) / 2];
      const rect: Pt[] = [
        [0, offY],
        [W, offY],
        [W, vb],
        [0, vb],
      ];
      const front = clipHalf(rect, M, n, true);
      const cut = clipHalf(rect, M, n, false);
      const flap = cut.map((p) => reflect(p, M, n));

      // 남는 앞면 — clip-path 는 쪽 기준 좌표라 offY 만큼 내린다
      page.style.clipPath =
        front.length > 2
          ? `polygon(${front.map((p) => `${p[0]}px ${p[1] - offY}px`).join(',')})`
          : 'polygon(0 0,0 0,0 0)';

      ctx.globalAlpha = Math.min(1, (1 - e) * 5);
      // 드러난 다음 쪽 위에 지는 그림자
      ctx.save();
      path(cut);
      ctx.clip();
      const sd = Math.min(90, len * 0.45);
      const g1 = ctx.createLinearGradient(
        M[0],
        M[1],
        M[0] + n[0] * sd,
        M[1] + n[1] * sd
      );
      g1.addColorStop(0, 'rgba(10,20,40,.30)');
      g1.addColorStop(1, 'rgba(10,20,40,0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, vh);
      ctx.restore();
      // 말려 올라간 뒷면
      ctx.save();
      ctx.shadowColor = 'rgba(10,20,40,.28)';
      ctx.shadowBlur = Math.min(28, 6 + len * 0.1);
      ctx.shadowOffsetX = -n[0] * 6;
      ctx.shadowOffsetY = -n[1] * 6;
      path(flap);
      ctx.fillStyle = flapColor(page);
      ctx.fill();
      ctx.restore();
      // 뒷면의 휘어진 빛
      ctx.save();
      path(flap);
      ctx.clip();
      const far = Math.max(1, len / 2);
      const g2 = ctx.createLinearGradient(
        M[0],
        M[1],
        M[0] - n[0] * far,
        M[1] - n[1] * far
      );
      g2.addColorStop(0, 'rgba(10,20,40,.20)');
      g2.addColorStop(0.06, 'rgba(255,255,255,.22)');
      g2.addColorStop(0.4, 'rgba(255,255,255,.04)');
      g2.addColorStop(1, 'rgba(10,20,40,.08)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, vh);
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    let lastCur = -1;
    const draw = () => {
      raf = 0;
      const s = scrollY;
      ctx.clearRect(0, 0, W, vh);
      let cur = 0;
      for (let i = 0; i < pages.length - 1; i++) {
        const q = (s - pins[i]) / T;
        const p = clamp(q);
        if (q >= 0.5) cur = i + 1;
        pages[i].toggleAttribute('data-turned', q >= 1);
        // 밑에 깔린 다음 쪽: 넘김이 끝날 때까지 제자리에 있는 것처럼 끌어올린다
        pages[i + 1].style.transform =
          p < 1 ? `translateY(${-(1 - p) * T}px)` : '';
        if (q > 0 && q < 1) curl(i, ease(p));
        else pages[i].style.clipPath = '';
      }

      // 목차: 책 안에 있을 때만 버튼을 띄우고, 지금 장을 표시한다
      const r = root.getBoundingClientRect();
      const inBook = r.top < vh * 0.5 && r.bottom > vh * 0.5;
      tocBtnRef.current?.toggleAttribute('data-show', inBook);
      if (cur !== lastCur) {
        lastCur = cur;
        tocRef.current
          ?.querySelectorAll('a')
          .forEach((a, i) =>
            a.setAttribute('aria-current', i === cur ? 'page' : 'false')
          );
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const goTo = (k: number) => {
      const target = clamp(k, 0, pages.length - 1);
      scrollTo({ top: restOf(target), behavior: 'smooth' });
    };

    // 장 이동 링크(쪽번호·접힌 귀·목차·첫 화면 버튼)는 앵커 그대로도 맞는 자리에 가지만, 부드럽게 넘기려고 가로챈다
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
        'a[href^="#book-ch-"]'
      );
      if (!a) return;
      const k = chapters.findIndex(
        (c) => `#${c.anchor}` === a.getAttribute('href')
      );
      if (k < 0) return;
      e.preventDefault();
      tocRef.current?.hidePopover?.();
      goTo(k);
      history.replaceState(null, '', a.getAttribute('href'));
    };

    // ← → 로 장 넘기기. 스페이스·PageDown 은 긴 장을 읽는 데 써야 해서 건드리지 않는다
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      if (isTyping(e.target)) return;
      const r = root.getBoundingClientRect();
      if (r.top > vh * 0.5 || r.bottom < vh * 0.5) return;
      e.preventDefault();
      goTo(lastCur + (e.key === 'ArrowRight' ? 1 : -1));
    };

    // 맛보기에서 책을 고르는 등 장 높이가 바뀌면 다시 잰다
    let mraf = 0;
    const remeasure = () => {
      if (!mraf)
        mraf = requestAnimationFrame(() => {
          mraf = 0;
          measure();
        });
    };
    const ro = new ResizeObserver(remeasure);
    pages.forEach((p) => ro.observe(p));

    measure();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', remeasure);
    addEventListener('keydown', onKey);
    // 첫 화면 버튼("어떻게 쓰나요?")·목차(popover 는 최상위 층)도 책 바깥이라 문서에서 받는다
    document.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(mraf);
      ro.disconnect();
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', remeasure);
      removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
      delete root.dataset.book;
      wraps.forEach((w) => (w.style.zIndex = ''));
      pages.forEach((p) => {
        p.style.top = '';
        p.style.transform = '';
        p.style.clipPath = '';
        p.removeAttribute('data-turned');
      });
    };
  }, [chapters]);

  return (
    <div ref={rootRef} className={styles.book}>
      {children}

      {/* 말린 종이 뒷면·그림자 — 넘기는 동안만 그린다 */}
      <canvas ref={canvasRef} aria-hidden='true' className={styles.canvas} />

      {/* 목차 — popover 라 여닫기에 JS 가 필요 없다 */}
      <button
        ref={tocBtnRef}
        type='button'
        popoverTarget='book-toc'
        className={styles.tocButton}
      >
        목차
      </button>
      <nav
        ref={tocRef}
        id='book-toc'
        popover='auto'
        aria-label='목차'
        className={styles.toc}
      >
        <p className={styles.tocTitle}>목차</p>
        <ol>
          {chapters.map((c) => (
            <li key={c.id}>
              <a href={`#${c.anchor}`}>
                <span className={styles.tocLabel}>{c.label}</span>
                <span className={styles.tocName}>{c.title}</span>
                <span aria-hidden='true' className={styles.tocNo}>
                  {c.folio}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};
