/**
 * 책 넘김 소리 — 녹음 파일 없이 브라우저에서 직접 합성한다 (시안 v9 "부드러운 종이", 2026-11-17 HJ 결정)
 *
 * - 기본 켜짐(2026-11-17 HJ), 끄면 기억한다. 단 브라우저가 첫 누르기(탭·클릭·키) 전엔
 *   AudioContext 를 막아서, 실제 소리는 그 뒤부터 난다(HomeBook 이 그때 ensurePageSound 를 부른다).
 * - 걸러 낸 잡음(스윽)과 낮은 사인파(툭)뿐이라 음원 저작권·파일 용량이 없다.
 * - 펼칠 때(표지 열림) · 넘길 때 · 덮을 때(뒤표지) 세 가지.
 */

export type PageSoundKind = 'open' | 'turn' | 'close';

type Ctx = { actx: AudioContext; master: GainNode };

let ctx: Ctx | null = null;

/** 사람이 누른 순간(소리 버튼·첫 탭·키)에 부른다 — 사용자 동작 안에서 만들어야 브라우저가 막지 않는다 */
export const ensurePageSound = (): boolean => {
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return false;
    const actx = new AC();
    // 귀에 거슬리는 고음을 깎고, 겹쳐 울려도 튀지 않게 누른다
    const lp = actx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5200;
    const comp = actx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    const master = actx.createGain();
    master.gain.value = 0.9;
    master.connect(lp).connect(comp).connect(actx.destination);
    ctx = { actx, master };
  }
  void ctx.actx.resume();
  return true;
};

/** 살짝 뭉툭한(분홍빛) 잡음 */
const noiseBuf = ({ actx }: Ctx, sec: number) => {
  const b = actx.createBuffer(
    1,
    Math.ceil(actx.sampleRate * sec),
    actx.sampleRate
  );
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = last * 0.6 + (Math.random() * 2 - 1) * 0.4;
    d[i] = last * 1.8;
  }
  return b;
};

/** 매끈한 '스윽' — 잡음을 저역 필터로 걸러 크기를 부드럽게 올렸다 내린다 */
const swish = (
  c: Ctx,
  t0: number,
  dur: number,
  f: [number, number, number?],
  peak: number,
  q = 0.7
) => {
  const { actx, master } = c;
  const src = actx.createBufferSource();
  src.buffer = noiseBuf(c, dur + 0.1);
  const lp = actx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = q;
  lp.frequency.setValueAtTime(f[0], t0);
  lp.frequency.linearRampToValueAtTime(f[1], t0 + dur * 0.45);
  lp.frequency.linearRampToValueAtTime(f[2] ?? f[0], t0 + dur);
  const hp = actx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 180;
  const g = actx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + dur * 0.35);
  g.gain.linearRampToValueAtTime(peak * 0.6, t0 + dur * 0.7);
  g.gain.linearRampToValueAtTime(0, t0 + dur);
  src.connect(lp).connect(hp).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.1);
};

/** 표지가 책 몸통에 닿는 '툭' — 낮은 사인 + 아주 짧은 저역 잡음 */
const thud = (
  c: Ctx,
  t0: number,
  vol: number,
  f0: number,
  f1: number,
  len = 0.18
) => {
  const { actx, master } = c;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(f1, t0 + len * 0.8);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + len + 0.02);
  swish(c, t0, 0.05, [420, 300, 200], vol * 0.35, 0.5);
};

const SOFT: Record<PageSoundKind, (c: Ctx, t: number) => void> = {
  open: (c, t) => {
    swish(c, t, 0.5, [500, 1300, 600], 0.1);
    thud(c, t + 0.42, 0.16, 100, 55);
  },
  turn: (c, t) => {
    swish(c, t, 0.3, [900, 2300, 1100], 0.07);
    swish(c, t + 0.27, 0.04, [500, 400], 0.035);
  },
  close: (c, t) => {
    swish(c, t, 0.4, [600, 1500, 700], 0.09);
    thud(c, t + 0.36, 0.26, 95, 46, 0.22);
    swish(c, t + 0.37, 0.12, [700, 500, 300], 0.05);
  },
};

/** 한 번 울린다 — ensurePageSound 전이면 아무것도 하지 않는다 */
export const playPageSound = (kind: PageSoundKind) => {
  if (!ctx) return;
  SOFT[kind](ctx, ctx.actx.currentTime + 0.01);
};

/** 넘김 방향에 맞는 소리 — 표지(0↔1)는 펼침/덮음, 마지막(뒤표지)은 덮음/펼침, 나머지는 넘김 */
export const soundForTurn = (
  from: number,
  to: number,
  turns: number
): PageSoundKind => {
  const lo = Math.min(from, to);
  const fwd = to > from;
  if (lo === 0) return fwd ? 'open' : 'close';
  if (lo === turns - 1) return fwd ? 'close' : 'open';
  return 'turn';
};
