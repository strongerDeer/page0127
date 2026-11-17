/**
 * 홈 책 무대의 종이 노이즈 — 캔버스에 한 번 그려 둔다.
 *
 * 처음엔 무대 ::after 의 background-image(SVG data URI)였는데, 브라우저가 이 배경을
 * "가장 큰 이미지"로 세서 LCP 가 책 모드가 켜지는 시점(모바일 실측 3.6~4.0초)으로 밀렸다.
 * 캔버스는 LCP 후보가 아니라서, 같은 SVG 를 캔버스 무늬(pattern)로 깔면 모양은 그대로이고
 * LCP 는 표지 글자(1.2~1.7초)로 돌아온다.
 *
 * 두 겹: 큰 얼룩(900px 타일) 위에 잔점(240px 타일) — CSS 여러 배경과 같은 순서.
 */
const SPECKS = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='.95' numOctaves='2' seed='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncR type='linear' slope='2.4' intercept='-.7'/><feFuncG type='linear' slope='2.4' intercept='-.7'/><feFuncB type='linear' slope='2.4' intercept='-.7'/></feComponentTransfer></filter><rect width='100%' height='100%' filter='url(#p)'/></svg>`;
const CLOUDS = `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='900'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='.012' numOctaves='3' seed='11' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#p)'/></svg>`;

// 아래 겹부터
export const NOISE_LAYERS = [
  { svg: CLOUDS, size: 900 },
  { svg: SPECKS, size: 240 },
] as const;

type Tile = { img: HTMLImageElement; size: number };

let tiles: Promise<Tile[]> | null = null;

// 타일 이미지는 문서에 붙이지 않는다(문서 밖 이미지는 LCP 후보가 아니다). 한 번만 디코드한다
const loadTiles = () =>
  (tiles ??= Promise.all(
    NOISE_LAYERS.map(async ({ svg, size }) => {
      const img = new Image();
      img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
      await img.decode();
      return { img, size };
    })
  ));

/**
 * 캔버스를 W×H(CSS px)로 맞추고 노이즈를 깐다. 같은 크기로 다시 부르면 그리지 않는다.
 * 타일은 화면 배율(dpr)로 래스터해서 레티나에서도 잔점이 뭉개지지 않게 한다.
 */
export const paintPaperNoise = async (
  cv: HTMLCanvasElement,
  W: number,
  H: number,
  dpr: number
) => {
  const w = Math.round(W * dpr);
  const h = Math.round(H * dpr);
  if (!w || !h || (cv.width === w && cv.height === h)) return;
  const loaded = await loadTiles().catch(() => null);
  const ctx = cv.getContext('2d');
  if (!loaded || !ctx) return;

  cv.width = w;
  cv.height = h;
  cv.style.width = `${W}px`;
  cv.style.height = `${H}px`;
  for (const { img, size } of loaded) {
    const s = Math.round(size * dpr);
    const tile = document.createElement('canvas');
    tile.width = s;
    tile.height = s;
    tile.getContext('2d')?.drawImage(img, 0, 0, s, s);
    const pattern = ctx.createPattern(tile, 'repeat');
    if (!pattern) continue;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
  }
};
