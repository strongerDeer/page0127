#!/usr/bin/env node
/**
 * 운영 sitemap.xml 의 주소 전체를 IndexNow 에 한 번에 제출한다.
 *
 * 언제 쓰나: 처음 IndexNow 를 붙였을 때 한 번, 그리고 고정 페이지(/about 등)나 설명 문구를 크게 바꿔 배포한 뒤.
 * 책 이야기 글은 어드민에서 저장할 때 앱이 알아서 보낸다(src/shared/lib/seo/indexNow.ts).
 *
 * 실행(키 파일이 운영에 배포된 뒤에):
 *   node scripts/indexnow-submit-all.mjs              # 실제 제출
 *   node scripts/indexnow-submit-all.mjs --dry-run    # 보낼 주소만 출력
 *
 * 키는 apps/page0127/public/{32자}.txt 파일 이름에서 읽는다 — 키를 한 곳(그 파일)에만 둔다.
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = process.env.SITE_URL ?? "https://page0127.com";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const dryRun = process.argv.includes("--dry-run");

const publicDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../apps/page0127/public",
);
const keyFiles = readdirSync(publicDir).filter((name) =>
  /^[a-f0-9]{32}\.txt$/.test(name),
);
if (keyFiles.length !== 1) {
  console.error(
    `키 파일을 하나만 찾아야 하는데 ${keyFiles.length}개다:`,
    keyFiles,
  );
  process.exit(1);
}
const key = keyFiles[0].replace(/\.txt$/, "");
const keyLocation = `${SITE}/${key}.txt`;

// 1) 키 파일이 운영에 올라가 있어야 검색엔진이 받아 준다
const keyResponse = await fetch(keyLocation);
const keyBody = keyResponse.ok ? (await keyResponse.text()).trim() : "";
if (keyBody !== key) {
  console.error(
    `운영에 키 파일이 아직 없다(${keyResponse.status}) — 배포 후 다시 실행한다: ${keyLocation}`,
  );
  process.exit(1);
}

// 2) sitemap 주소 모으기
const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((match) => match[1].trim())
  .filter((url) => url.startsWith(SITE));

console.log(`sitemap 주소 ${urlList.length}개`);
if (dryRun) {
  urlList.forEach((url) => console.log(` - ${url}`));
  process.exit(0);
}

// 3) 제출 — IndexNow 는 한 번에 10,000개까지 받는다
const response = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: new URL(SITE).host,
    key,
    keyLocation,
    urlList,
  }),
});
console.log(`IndexNow 응답 ${response.status}`, await response.text());
// 200 = 받음, 202 = 받았고 키 확인 중, 403 = 키 불일치, 422 = 다른 도메인 주소 섞임, 429 = 너무 자주
process.exit(response.ok ? 0 : 1);
