#!/usr/bin/env node
/**
 * 배지 표지 시트(PNG 원본)를 화면에 실을 AVIF·WebP 사본으로 미리 만든다.
 *
 * 왜 Next 이미지 최적화를 쓰지 않는가 (2026-10-26 주간 품질 회귀):
 * 시트 한 장이 2MB PNG 라 `/_next/image` 가 WebP q85 로 줄여도 640px 한 장에
 * 100~170KB 가 나왔다. 홈 맛보기 아래 배지 5개가 시트 3장을 받아 이미지가 +418KB,
 * 프로필 배지 선반이 +463KB 늘었다. AVIF 는 같은 크기에서 절반 이하인데, 전역
 * images.formats 에 AVIF 를 켜면 원격 표지 변환까지 형식별로 두 배가 되어
 * Vercel 변환 한도를 다시 태운다(2026-08 표지가 사라진 원인). 그래서 로컬 시트만
 * 빌드 전에 한 번 변환해 정적 파일로 둔다.
 *
 * 사용: 원본 PNG 를 바꾸거나 시트를 추가하면 다시 돌리고 결과물을 커밋한다.
 *   node scripts/build-badge-art.mjs
 * sharp 는 next 의존성으로 이미 설치돼 있다.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC_DIR = join(ROOT, "apps/page0127/public/badges/editorial");
const OUT_DIR = join(SRC_DIR, "sized");

// badgeCoverArt.ts 의 BADGE_ART_WIDTHS 와 같아야 한다
const WIDTHS = [384, 480, 640, 800];
const SHEETS = [
  "story-art-v3",
  "companion-art-v7",
  "expansion-art-v5",
  "companion-art-v2",
];

mkdirSync(OUT_DIR, { recursive: true });

for (const name of SHEETS) {
  for (const width of WIDTHS) {
    const resized = sharp(join(SRC_DIR, `${name}.png`)).resize({ width });
    // AVIF q55 · WebP q80 — 2배 확대해 비교해도 글자 획과 종이 질감이 원본 q85 와 구분되지 않았다
    const avif = await resized
      .clone()
      .avif({ quality: 55 })
      .toFile(join(OUT_DIR, `${name}-${width}.avif`));
    const webp = await resized
      .clone()
      .webp({ quality: 80 })
      .toFile(join(OUT_DIR, `${name}-${width}.webp`));
    console.log(
      `${name}-${width}: avif ${Math.round(avif.size / 1024)}KB · webp ${Math.round(webp.size / 1024)}KB`,
    );
  }
}
