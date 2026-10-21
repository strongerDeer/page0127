/**
 * 뱃지 이미지 합성 — 틀(frame) + 안쪽 그림(art) → public/badges/*.webp
 *
 * 왜 합성하는가:
 *   AI 로 뱃지를 통째로 그리면 매번 틀(책 비율·리본 위치·테두리·기울기)이 달라진다.
 *   그래서 틀은 3장만 한 번 그리고, 뱃지마다 다른 건 안쪽 그림뿐이게 한다.
 *   프롬프트와 생성 현황: /mnt/project-files/badge/prompts.md
 *
 * 입력 (Figma 에서 내보낸 1024×1024 PNG):
 *   <src>/frames/frame-book.png      성장 뱃지 (책 표지)
 *   <src>/frames/frame-bookmark.png  이야기 뱃지 (책갈피)
 *   <src>/frames/frame-seal.png      히든 뱃지 (밀랍 봉인)
 *   <src>/art/art-<이름>.png          안쪽 그림 (정사각, 테두리·글자 없음)
 *   틀의 안쪽 창은 마젠타(#FF00FF) 로 비워 둔다.
 *
 * 처리:
 *   1. 틀 둘레의 단색 배경을 가장자리에서부터 채워 지운다 (안쪽 회색은 남는다)
 *   2. 남은 뱃지 영역만 잘라 같은 600×800 칸에 맞춘다
 *      - 책·책갈피: 칸에 꽉 채운다 → 가로세로가 서로 똑같다
 *      - 봉인: 비율을 지켜 가로 600 에 맞추고 세로 가운데
 *   3. 마젠타 창을 찾아 그 모양대로 안쪽 그림을 잘라 넣는다
 *   4. WebP 로 저장. 숫자·물음표·흑백(잠김)은 화면 코드가 얹는다
 *
 * 사용법:
 *   node scripts/build-badge-assets.mjs --src /mnt/project-files/badge/source
 *   node scripts/build-badge-assets.mjs --src <dir> --only shelf-1,brick
 *
 * sharp 는 next 가 함께 설치하는 것을 빌려 쓴다 (앱 실행에는 필요 없는 일회성 도구).
 */

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "apps/page0127/public/badges");

/** 화면의 뱃지 칸과 같은 3:4 — 화면에서는 이 절반 크기(@2x) */
const BOX = { width: 600, height: 800 };

/** 그림 이름 → 틀. 성장은 책, 히든은 봉인, 나머지(이야기)는 책갈피 */
const HIDDEN = [
  "day-0127",
  "new-year",
  "double-finish",
  "honest",
  "thin-but-deep",
  "new-release",
  "book-about-books",
  "worn-out",
];
const frameOf = (name) => {
  if (name.startsWith("shelf-") || name.startsWith("wide-")) return "book";
  if (HIDDEN.includes(name)) return "seal";
  return "bookmark";
};

/** 배경과 이 거리(RGB 합) 이상 다르면 뱃지로 본다 — 옅은 그림자는 배경 쪽으로 */
const BG_TOLERANCE = 60;

const isMagenta = (r, g, b) => r > 170 && b > 170 && g < 110 && r - g > 90;

const args = process.argv.slice(2);
const argValue = (flag) => {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1];
};

/** 가장자리에서 배경색과 이어진 픽셀만 투명하게 (뱃지 안쪽 회색은 지키려고 채우기 방식) */
const removeBackground = ({ data, width, height }) => {
  const at = (x, y) => (y * width + x) * 4;
  const corner = [0, 1, 2].map(
    (c) =>
      (data[at(0, 0) + c] +
        data[at(width - 1, 0) + c] +
        data[at(0, height - 1) + c] +
        data[at(width - 1, height - 1) + c]) /
      4,
  );
  const isBg = (i) =>
    Math.abs(data[i] - corner[0]) +
      Math.abs(data[i + 1] - corner[1]) +
      Math.abs(data[i + 2] - corner[2]) <
    BG_TOLERANCE;

  const seen = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, 0, x, height - 1);
  for (let y = 0; y < height; y++) stack.push(0, y, width - 1, y);
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const p = y * width + x;
    if (seen[p]) continue;
    seen[p] = 1;
    if (!isBg(p * 4)) continue;
    data[p * 4 + 3] = 0;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
};

/** 불투명 픽셀을 감싸는 사각형 */
const opaqueBounds = ({ data, width, height }) => {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) throw new Error("뱃지 영역을 찾지 못했어요 (배경만 있음)");
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
};

const raw = async (image) => {
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
};

/** 틀 하나를 600×800 칸에 맞춘 RGBA 버퍼로 */
const loadFrame = async (file, shape) => {
  const source = await raw(sharp(file));
  removeBackground(source);
  const bounds = opaqueBounds(source);
  const cropped = sharp(source.data, {
    raw: { width: source.width, height: source.height, channels: 4 },
  }).extract(bounds);

  const fitted =
    shape === "seal"
      ? cropped.resize({
          ...BOX,
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
      : cropped.resize({ ...BOX, fit: "fill" });
  // raw 로 한 번 굳혀야 resize 뒤 픽셀을 읽을 수 있다
  return raw(sharp(await fitted.png().toBuffer()));
};

/** 마젠타 창 마스크 — 테두리와 섞인 가장자리를 덮도록 1px 넓힌다 */
const windowMask = ({ data, width, height }) => {
  const mask = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    if (data[i + 3] > 0 && isMagenta(data[i], data[i + 1], data[i + 2])) {
      mask[p] = 1;
    }
  }
  const grown = mask.slice();
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      if (mask[p]) continue;
      if (mask[p - 1] || mask[p + 1] || mask[p - width] || mask[p + width]) {
        grown[p] = 1;
      }
    }
  }
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!grown[y * width + x]) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) throw new Error("마젠타 창을 찾지 못했어요");
  return {
    mask: grown,
    bounds: { left, top, width: right - left + 1, height: bottom - top + 1 },
  };
};

/** 틀의 창 자리에 그림(또는 단색)을 채운다 */
const fillWindow = (frame, { mask, bounds }, art) => {
  const out = Buffer.from(frame.data);
  for (let y = 0; y < bounds.height; y++) {
    for (let x = 0; x < bounds.width; x++) {
      const p = (bounds.top + y) * frame.width + bounds.left + x;
      if (!mask[p]) continue;
      const a = (y * bounds.width + x) * 4;
      out[p * 4] = art ? art.data[a] : 214;
      out[p * 4 + 1] = art ? art.data[a + 1] : 218;
      out[p * 4 + 2] = art ? art.data[a + 2] : 224;
      out[p * 4 + 3] = 255;
    }
  }
  return out;
};

const save = async (buffer, name) => {
  await sharp(buffer, {
    raw: { width: BOX.width, height: BOX.height, channels: 4 },
  })
    .webp({ quality: 88, alphaQuality: 90 })
    .toFile(path.join(OUT_DIR, `${name}.webp`));
  console.log(`  ✓ ${name}.webp`);
};

const main = async () => {
  const src = argValue("--src");
  if (!src) {
    console.error("--src <폴더> 가 필요해요 (frames/, art/ 를 담은 곳)");
    process.exit(1);
  }
  const only = argValue("--only")?.split(",");
  mkdirSync(OUT_DIR, { recursive: true });

  const frames = {};
  for (const shape of ["book", "bookmark", "seal"]) {
    const file = path.join(src, "frames", `frame-${shape}.png`);
    if (!existsSync(file)) {
      console.warn(`  - frame-${shape}.png 없음 → 이 틀의 뱃지는 건너뜀`);
      continue;
    }
    const frame = await loadFrame(file, shape);
    frames[shape] = { frame, window: windowMask(frame) };
    const { bounds } = frames[shape].window;
    console.log(
      `틀 ${shape}: 창 ${bounds.width}×${bounds.height} @ (${bounds.left}, ${bounds.top})`,
    );
  }

  // 잠긴 히든 뱃지 — 그림 대신 단색 봉인. 물음표와 흑백은 화면이 얹는다
  if (frames.seal && (!only || only.includes("seal-locked"))) {
    await save(
      fillWindow(frames.seal.frame, frames.seal.window),
      "seal-locked",
    );
  }

  const artDir = path.join(src, "art");
  const artFiles = existsSync(artDir)
    ? readdirSync(artDir).filter((f) => /^art-.+\.png$/.test(f))
    : [];
  for (const file of artFiles.sort()) {
    const name = file.replace(/^art-/, "").replace(/\.png$/, "");
    if (only && !only.includes(name)) continue;
    const target = frames[frameOf(name)];
    if (!target) continue;
    const art = await raw(
      sharp(path.join(artDir, file)).resize({
        width: target.window.bounds.width,
        height: target.window.bounds.height,
        fit: "cover",
      }),
    );
    await save(fillWindow(target.frame, target.window, art), name);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
