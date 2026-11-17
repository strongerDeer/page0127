'use client';

import { useEffect, useRef, useState } from 'react';

import {
  ensurePageSound,
  playPageSound,
  soundForTurn,
} from '../model/pageSound';

import type { BookChapter } from '../model/chapters';

import styles from './HomeBook.module.css';

type HomeBookProps = {
  chapters: BookChapter[];
  /**
   * 서버에서 그린 쪽들 — 표지(CoverPage) · 장(Chapter)… · 뒤표지(BackCover) 순서.
   * 이 컴포넌트는 겹치고 넘기기만 하고 내용은 건드리지 않는다.
   */
  children: React.ReactNode;
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
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

/** 스페이스를 눌러 쓰는 것(버튼·링크) 위에선 스페이스로 넘기지 않는다 */
const usesSpace = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  Boolean(el.closest('button, a, summary, [role="button"], [role="option"]'));

/** 쪽을 복제해 책 속 쪽(표지 안 첫 쪽·덮일 책의 앞면)에 줄여 넣는다 — 확대/축소가 끝나면 진짜 쪽과 딱 겹친다 */
const cloneInto = (
  host: HTMLElement,
  page: HTMLElement,
  W: number,
  H: number,
  scale: number
) => {
  host.querySelector('[data-book-twin]')?.remove();
  const twin = page.cloneNode(true) as HTMLElement;
  twin.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  twin.removeAttribute('id');
  twin.removeAttribute('data-book-page');
  twin.removeAttribute('data-book-current');
  twin.setAttribute('data-book-twin', '');
  twin.setAttribute('aria-hidden', 'true');
  twin.inert = true;
  Object.assign(twin.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: `${W}px`,
    height: `${H}px`,
    minHeight: '0',
    margin: '0',
    zIndex: 'auto',
    visibility: 'inherit',
    clipPath: 'none',
    transform: `translate(-50%, -50%) scale(${1 / scale})`,
    pointerEvents: 'none',
  });
  host.append(twin);
  return twin;
};

/**
 * 홈 "한 권의 책" — 시안 v9 의 뼈대 그대로: 화면에 붙은 무대 하나에 쪽을 겹쳐 두고, 스크롤로 넘긴다
 *
 * 좌표 (H = 무대 높이 = 창 − 헤더 − 하단 탭바, STEP = 쪽 하나 넘기는 스크롤 = 0.8H)
 * - 무대(.stage)는 sticky 라 책 길이(쪽 넘김 수 × STEP) 동안 화면에 붙어 있다.
 * - 진행도 prog = (스크롤 − 시작) / STEP. 정수 k 면 k 번째 쪽이 펼쳐져 있고, k~k+1 사이면 넘기는 중.
 *   - 0→1 : 표지가 열리면서(0~55%) 책으로 다가가(25~100%), 표지 안 첫 쪽(1장 복제본)이 정확히 화면 크기가
 *           되는 순간 그게 곧 1장이다 — 이음매가 없다.
 *   - 가운데 : 쪽 오른쪽 아래 모서리가 말려 넘어간다(clip-path + 캔버스에 뒷면·그림자).
 *   - 마지막 : 마지막 장(복제본)이 화면 가득에서 책 크기로 줄고 뒤집혀 뒤표지가 된다. 버튼이 그 아래 떠오른다.
 * - 쪽마다 스냅 자리가 있어(scroll-snap, mandatory) 한 번 밀면 한 쪽씩 넘어간다.
 *
 * 성능
 * - 스크롤마다 rAF 한 번, 만지는 건 넘기는 쪽 하나의 clip-path·transform 뿐. 캔버스는 넘기는 동안만 그린다.
 * - 쪽 내용은 서버에서 그린 HTML 그대로라 검색엔진·스크린리더가 모두 읽는다.
 * - 동작 줄이기·JS 실패 → data-book 을 켜지 않아 쪽이 평범하게 위아래로 이어진다.
 */
export const HomeBook = ({ chapters, children }: HomeBookProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapsRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const tocRef = useRef<HTMLElement>(null);
  // 넘김 소리 — 기본 꺼짐. 스크롤 처리(effect 안)에서도 읽게 ref 에 함께 둔다
  const [sound, setSound] = useState(false);
  const soundRef = useRef(false);

  const toggleSound = () => {
    if (!sound && !ensurePageSound()) return;
    const on = !sound;
    soundRef.current = on;
    setSound(on);
    if (on) playPageSound('turn');
  };

  // 쪽 순서대로의 목차 — 표지 · 장… · 뒤표지
  const entries = [
    { anchor: 'book-cover', label: '', title: '표지', folio: null },
    ...chapters.map((c) => ({ ...c, folio: c.folio as number | null })),
    { anchor: 'book-back', label: '', title: '뒤표지', folio: null },
  ];
  const anchorKey = entries.map((e) => e.anchor).join(' ');

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const cv = canvasRef.current;
    const snapBox = snapsRef.current;
    const ctx = cv?.getContext('2d');
    if (!root || !stage || !cv || !snapBox || !ctx) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const anchors = anchorKey.split(' ');
    const pages = [
      ...stage.querySelectorAll<HTMLElement>(':scope > [data-book-page]'),
    ];
    const N = pages.length;
    if (N < 3) return;
    const TURNS = N - 1;
    const q = (el: HTMLElement, sel: string) =>
      el.querySelector<HTMLElement>(sel);

    // 표지(첫 쪽)와 뒤표지(마지막 쪽)의 움직이는 부분
    const cover = {
      book: q(pages[0], '[data-cover-book]'),
      lid: q(pages[0], '[data-cover-lid]'),
      leaf: q(pages[0], '[data-cover-leaf]'),
      cta: q(pages[0], '[data-cover-cta]'),
    };
    const back = {
      book: q(pages[TURNS], '[data-back-book]'),
      flip: q(pages[TURNS], '[data-back-flip]'),
      front: q(pages[TURNS], '[data-back-front]'),
      cta: q(pages[TURNS], '[data-back-cta]'),
    };
    const snaps = [...snapBox.children] as HTMLElement[];
    const html = document.documentElement;
    const coarse = matchMedia('(pointer: coarse)').matches;

    root.dataset.book = 'on';

    let W = 0;
    let H = 0;
    let vh = 0;
    let gnb = 64;
    let STEP = 1;
    let start = 0;
    let raf = 0;
    let S0 = 1;
    let S1 = 1;
    let coverD: Pt = [0, 0];
    let backD: Pt = [0, 0];
    let twin: HTMLElement | null = null;
    let cur = 0;
    let lastCur = -1;
    // 넘김 안내는 두 쪽 넘게 넘겨 본 뒤엔 1장에서 다시 띄우지 않는다(표지에선 늘 띄운다)
    let turnedEnough = false;
    // 폰에서 검색창에 글을 쓰는 동안은 쪽을 고정한다 — 키보드가 올라오며 브라우저가 스크롤을 옮겨도 넘어가지 않게
    let lock: number | null = null;

    const restOf = (k: number) => start + clamp(k, 0, TURNS) * STEP;

    // 이 요소의 가운데를 무대 가운데로 옮기는 이동량
    const toCenter = (el: HTMLElement): Pt => {
      const r = el.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      return [
        W / 2 - (r.left - s.left + r.width / 2),
        H / 2 - (r.top - s.top + r.height / 2),
      ];
    };

    const measure = () => {
      vh = innerHeight;
      W = html.clientWidth;
      gnb =
        document.querySelector('header')?.getBoundingClientRect().height ?? 64;
      const bar = document.querySelector<HTMLElement>('[data-bottom-bar]');
      const bottom =
        bar && getComputedStyle(bar).display !== 'none' ? bar.offsetHeight : 0;
      H = vh - gnb - bottom;
      STEP = Math.max(1, Math.round(H * 0.8));

      root.style.setProperty('--book-gnb', `${gnb}px`);
      root.style.setProperty('--book-h', `${H}px`);
      root.style.setProperty('--book-bottom', `${bottom}px`);
      root.style.setProperty('--book-run', `${TURNS * STEP}px`);
      start = root.getBoundingClientRect().top + scrollY - gnb;

      // 스냅 자리: [0] 문서 맨 위(배너가 있을 때), 쪽마다 하나, 마지막은 책 뒤(푸터) —
      // 책 뒤 자리가 없으면 뒤표지에서 아래로 밀어도 뒤표지로 되돌아와 푸터에 갈 수 없다
      // (브라우저가 스크롤 끝 위치로 맞춰 준다)
      const last = snaps.length - 1;
      snaps.forEach((s, i) => {
        s.style.top = `${i === 0 ? -start : i === last ? root.offsetHeight : (i - 1) * STEP}px`;
        s.hidden = i === 0 && start < 2;
      });

      // 표지: 책이 화면을 채우는 배율, 그 안 첫 쪽에 1장 복제본
      if (cover.book && cover.leaf) {
        cover.book.style.transform = 'none';
        const r = cover.book.getBoundingClientRect();
        S0 = Math.max(W / r.width, H / r.height);
        coverD = toCenter(cover.book);
        twin = cloneInto(cover.leaf, pages[1], W, H, S0);
      }
      // 뒤표지: 마지막 장 복제본을 덮일 책의 앞면에
      if (back.book && back.front) {
        back.book.style.transform = 'none';
        const r = back.book.getBoundingClientRect();
        S1 = Math.max(W / r.width, H / r.height);
        backD = toCenter(back.book);
        cloneInto(back.front, pages[TURNS - 1], W, H, S1);
      }

      const dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = W * dpr;
      cv.height = H * dpr;
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    // 말린 뒷면 = 같은 종이의 뒷면이라 그 쪽 바탕색 그대로. 다크 모드 전환도 따라가게 그때그때 읽는다
    const flapColor = (page: HTMLElement) => {
      const c = getComputedStyle(page).backgroundColor;
      return isTransparent(c) ? getComputedStyle(html).backgroundColor : c;
    };

    const path = (poly: Pt[]) => {
      ctx.beginPath();
      poly.forEach((p, i) =>
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])
      );
      ctx.closePath();
    };

    // 쪽을 오른쪽 아래 모서리에서 e(0~1)만큼 말아 넘긴다 (시안 v9 과 같은 계산)
    const curl = (page: HTMLElement, e: number) => {
      const Cn: Pt = [W, H];
      const P: Pt = [W - 2 * W * e, H - H * 0.3 * Math.sin(Math.PI * e)];
      const dx = Cn[0] - P[0];
      const dy = Cn[1] - P[1];
      const len = Math.hypot(dx, dy) || 1;
      const n: Pt = [dx / len, dy / len];
      const M: Pt = [(Cn[0] + P[0]) / 2, (Cn[1] + P[1]) / 2];
      const rect: Pt[] = [
        [0, 0],
        [W, 0],
        [W, H],
        [0, H],
      ];
      const front = clipHalf(rect, M, n, true);
      const cut = clipHalf(rect, M, n, false);
      const flap = cut.map((p) => reflect(p, M, n));

      page.style.clipPath =
        front.length > 2
          ? `polygon(${front.map((p) => `${p[0]}px ${p[1]}px`).join(',')})`
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
      ctx.fillRect(0, 0, W, H);
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
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      raf = 0;
      const y = scrollY;
      // 책 안에서만 스냅한다 — 책이 끝난 뒤(푸터)는 평소처럼 자유롭게 스크롤
      html.style.scrollSnapType = y <= restOf(TURNS) + 2 ? 'y mandatory' : '';

      let prog = lock ?? clamp((y - start) / STEP, 0, TURNS);
      if (Math.abs(prog - Math.round(prog)) < 0.004) prog = Math.round(prog);
      const k = Math.min(TURNS - 1, Math.floor(prog));
      const t = prog >= TURNS ? 1 : prog - k;
      cur = Math.round(prog);
      const closing = k === TURNS - 1 && t > 0;
      ctx.clearRect(0, 0, W, H);

      pages.forEach((pg, i) => {
        pg.style.zIndex = String(closing && i === TURNS ? N + 1 : N - i);
        const gone = i < k || (i === k && t >= 1) || (closing && i === k);
        pg.style.visibility = gone ? 'hidden' : '';
        if (i !== k || closing) pg.style.clipPath = '';
        pg.toggleAttribute('data-book-current', i === cur);
      });

      // 1장 문장: 거의 펼쳤을 때 단어가 차례로 진해진다(표지 속 복제본도 같이)
      const lit = prog > 0.7;
      pages[1].toggleAttribute('data-lit', lit);
      twin?.toggleAttribute('data-lit', lit);

      // 목차: 책 안에 있을 때만 버튼을 띄우고, 지금 쪽을 표시한다
      const r = root.getBoundingClientRect();
      toolsRef.current?.toggleAttribute(
        'data-show',
        r.top < vh * 0.5 && r.bottom > vh * 0.5
      );
      if (cur >= 2) turnedEnough = true;
      hintRef.current?.toggleAttribute(
        'data-show',
        r.top > -vh * 0.5 &&
          r.bottom > vh * 0.5 &&
          (cur === 0 || (cur === 1 && !turnedEnough))
      );
      if (cur !== lastCur) {
        if (lastCur >= 0 && soundRef.current)
          playPageSound(soundForTurn(lastCur, cur, TURNS));
        lastCur = cur;
        tocRef.current
          ?.querySelectorAll('a')
          .forEach((a, i) =>
            a.setAttribute('aria-current', i === cur ? 'page' : 'false')
          );
      }

      // 표지: 열리면서 책 속으로 들어간다
      if (k === 0 && cover.book && cover.lid) {
        const open = ease(seg(t, 0, 0.55));
        const zoom = ease(seg(t, 0.25, 1));
        cover.lid.style.transform = `rotateY(${-178 * open}deg)`;
        const s = 1 + (S0 - 1) * zoom;
        cover.book.style.transform = `translate(${coverD[0] * zoom}px, ${coverD[1] * zoom}px) scale(${s})`;
        if (cover.cta) {
          const fade = seg(t, 0.05, 0.3);
          cover.cta.style.opacity = String(1 - fade);
          cover.cta.style.visibility = fade >= 1 ? 'hidden' : '';
        }
        return;
      }

      // 마지막: 마지막 장이 줄어들며 책이 되고, 뒤집혀 뒤표지가 보인다
      if (k === TURNS - 1 && back.book && back.flip) {
        const z = ease(seg(t, 0, 0.55));
        const fl = ease(seg(t, 0.4, 1));
        const s = S1 + (1 - S1) * z;
        back.book.style.transform = `translate(${backD[0] * (1 - z)}px, ${backD[1] * (1 - z)}px) scale(${s})`;
        back.flip.style.transform = `perspective(1600px) rotateY(${180 * fl}deg)`;
        if (back.cta) {
          const show = seg(t, 0.7, 1);
          back.cta.style.opacity = String(show);
          back.cta.style.visibility = show <= 0 ? 'hidden' : '';
        }
        return;
      }

      if (t > 0.001) curl(pages[k], ease(t));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const jump = (k: number, smooth: boolean) => {
      lock = null;
      scrollTo({ top: restOf(k), behavior: smooth ? 'smooth' : 'instant' });
      if (!smooth) draw();
    };

    const indexOfHash = (hash: string) => anchors.indexOf(hash.slice(1));

    // 덮여 있는(또는 이미 넘긴) 쪽 안으로 키보드 포커스가 들어가면 그 쪽을 펼친다 — 탭으로 다음 쪽에 넘어가기.
    // 지금 보이는 쪽(넘기는 중이면 앞뒤 두 쪽)이면 그대로 둔다(누르던 클릭이 엉뚱한 곳에 떨어지지 않게)
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const k = pages.findIndex((p) => p.contains(el));
      if (k < 0) return;
      const prog = clamp((scrollY - start) / STEP, 0, TURNS);
      const visible =
        k === cur || k === Math.floor(prog) || k === Math.ceil(prog);
      if (!visible) jump(k, false);
      if (coarse && isTyping(el)) lock = k;
    };

    const onFocusOut = (e: FocusEvent) => {
      if (lock === null || !isTyping(e.target)) return;
      const k = lock;
      lock = null;
      // 키보드가 내려가며 옮겨진 스크롤을 그 쪽 자리로 되돌린다
      requestAnimationFrame(() => jump(k, false));
    };

    // 쪽 이동 링크(쪽번호·접힌 귀·목차·첫 화면 버튼)는 앵커 그대로도 맞는 자리에 가지만, 부드럽게 넘기려고 가로챈다
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('a[data-book-restart]')) {
        e.preventDefault();
        jump(0, true);
        history.replaceState(null, '', location.pathname + location.search);
        return;
      }
      const a = target?.closest<HTMLAnchorElement>('a[href^="#book-"]');
      if (!a) return;
      const href = a.getAttribute('href') ?? '';
      const k = indexOfHash(href);
      if (k < 0) return;
      e.preventDefault();
      tocRef.current?.hidePopover?.();
      jump(k, true);
      history.replaceState(null, '', href);
    };

    const onHash = () => {
      const k = indexOfHash(location.hash);
      if (k >= 0) jump(k, false);
    };

    // 방향키·PageUp/Down·스페이스로 한 쪽씩. 글을 쓰는 중이거나 책 밖이면 건드리지 않는다
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const fwd = ['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key);
      const bwd = ['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key);
      if (!fwd && !bwd) return;
      if (e.key === ' ' && (e.shiftKey || usesSpace(e.target))) return;
      if (isTyping(e.target)) return;
      if (scrollY < start - 2 || scrollY > restOf(TURNS) + 2) return;
      if ((fwd && cur >= TURNS) || (bwd && cur <= 0)) return;
      e.preventDefault();
      jump(cur + (fwd ? 1 : -1), true);
    };

    let mraf = 0;
    const remeasure = () => {
      if (!mraf)
        mraf = requestAnimationFrame(() => {
          mraf = 0;
          measure();
        });
    };
    // 창 크기·주소창 높이가 바뀌면 다시 잰다. 쪽 내용이 바뀌어도(맛보기에서 책을 고름) 쪽 크기는 그대로다
    const ro = new ResizeObserver(remeasure);
    ro.observe(stage);

    measure();
    // 쪽 앵커로 바로 들어온 경우(공유 링크·새로고침): 브라우저는 책 모드가 켜지기 전 평평한 배치 기준으로
    // 스크롤해 뒀으니, 겹친 책 기준의 그 쪽 자리로 다시 맞춘다
    onHash();
    document.fonts?.ready.then(remeasure);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', remeasure);
    addEventListener('keydown', onKey);
    addEventListener('hashchange', onHash);
    // 첫 화면 버튼·목차(popover 는 최상위 층)도 받으려고 문서에서 받는다
    document.addEventListener('click', onClick);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(mraf);
      ro.disconnect();
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', remeasure);
      removeEventListener('keydown', onKey);
      removeEventListener('hashchange', onHash);
      document.removeEventListener('click', onClick);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      html.style.scrollSnapType = '';
      delete root.dataset.book;
      root.querySelectorAll('[data-book-twin]').forEach((el) => el.remove());
      [
        cover.book,
        cover.lid,
        cover.cta,
        back.book,
        back.flip,
        back.cta,
        ...pages,
      ].forEach((el) => {
        if (!el) return;
        el.style.transform = '';
        el.style.opacity = '';
        el.style.visibility = '';
        el.style.clipPath = '';
        el.style.zIndex = '';
        el.removeAttribute('data-book-current');
        el.removeAttribute('data-lit');
      });
    };
  }, [anchorKey]);

  return (
    <div ref={rootRef} className={styles.book}>
      {/* 스크롤 스냅 자리 — [0] 문서 맨 위, 쪽마다 하나, 마지막은 책 뒤(푸터) (위치는 JS) */}
      <div ref={snapsRef} aria-hidden='true'>
        {['top', ...entries.map((e) => e.anchor), 'after'].map((key) => (
          <div key={key} className={styles.snap} />
        ))}
      </div>

      <div ref={stageRef} className={styles.stage}>
        {children}
        {/* 말린 종이 뒷면·그림자 — 넘기는 동안만 그린다 */}
        <canvas ref={canvasRef} aria-hidden='true' className={styles.canvas} />
      </div>

      {/* 무대가 붙어 있는 동안 스크롤할 길이(쪽 넘김 수 × STEP) */}
      <div aria-hidden='true' className={styles.run} />

      {/* 넘김 안내 — 표지와 1장에서만. 마우스·키보드면 스크롤·방향키, 터치면 밀기를 알려 준다 */}
      <p ref={hintRef} aria-hidden='true' className={styles.hint}>
        <span className={styles.hintArrow} />
        <span className={styles.hintFine}>
          스크롤하거나 <kbd>←</kbd> <kbd>→</kbd> 키로 넘겨요
        </span>
        <span className={styles.hintTouch}>위로 밀면 다음 쪽으로 넘어가요</span>
      </p>

      {/* 책 도구 — 책 안에 있을 때만 뜬다. 목차는 popover 라 여닫기에 JS 가 필요 없다 */}
      <div ref={toolsRef} className={styles.tools}>
        <button
          type='button'
          aria-pressed={sound}
          aria-label={sound ? '넘김 소리 끄기' : '넘김 소리 켜기'}
          onClick={toggleSound}
          className={styles.tool}
        >
          <svg
            aria-hidden='true'
            viewBox='0 0 16 16'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.6'
            className={styles.toolIcon}
          >
            <path d='M2 6h3l4-3v10l-4-3H2z' />
            {sound ? (
              <path d='M11.5 5.5a3.5 3.5 0 0 1 0 5' />
            ) : (
              <path d='M11.5 6l3 4m0-4l-3 4' />
            )}
          </svg>
          소리
        </button>
        <button type='button' popoverTarget='book-toc' className={styles.tool}>
          목차
        </button>
      </div>
      <nav
        ref={tocRef}
        id='book-toc'
        popover='auto'
        aria-label='목차'
        className={styles.toc}
      >
        <p className={styles.tocTitle}>목차</p>
        <ol>
          {entries.map((c) => (
            <li key={c.anchor}>
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
