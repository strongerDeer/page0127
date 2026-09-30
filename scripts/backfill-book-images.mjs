/**
 * 기존 도서에 YES24 상품번호·표지·책등·치수를 채워 넣는다.
 *
 * 왜 필요한가:
 *   알라딘 OpenAPI 가 2026-10-30 에 종료된다. 2026-09-28 에 이 스크립트로 전량(164권)을
 *   옮겼고, 그 뒤 알라딘 폴백은 걷어냈다. 지금은 YES24 로만 조회하고, YES24 에 없는
 *   책은 DB 에 저장된 외부 URL 에서 이미지만 건진다. 외부 CDN 에 기대 둔 표지는
 *   언제 차단될지 알 수 없어서 우리 Storage 로 옮겨 둔다.
 *
 * 무엇을 남기는가 (공급자가 또 바뀌어도 살아남는 것):
 *   1. provider_item_id — 이미지 URL 을 API 없이 조립하는 열쇠. 영구히 유효하다.
 *   2. book-covers 버킷의 이미지 사본 — 외부 CDN 차단과 무관해진다.
 *   3. 치수(두께) — 백필 때 받지 않으면 나중에 책마다 다시 호출해야 한다.
 *
 * 사용법:
 *   node scripts/backfill-book-images.mjs --dry-run        무엇이 바뀔지만 출력
 *   node scripts/backfill-book-images.mjs                  실제 실행
 *   node scripts/backfill-book-images.mjs --limit 20       앞의 20권만
 *   node scripts/backfill-book-images.mjs --force          이미 끝난 행도 다시
 *   node scripts/backfill-book-images.mjs --env .env.local  환경파일 지정
 *
 * 중단해도 안전하다. 이미 끝난 행(cover_synced_at 이 있는 행)은 건너뛰므로
 * 그냥 다시 실행하면 이어서 진행한다.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(path.join(process.cwd(), 'apps/page0127/'));
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');

// ─── 설정 ──────────────────────────────────────────────────────────────

/** YES24 Basic 등급은 10 RPS. 여유를 두고 초당 5건으로 간다. */
const REQUEST_INTERVAL_MS = 200;

/**
 * 화면에 쓰는 크기로 줄여 보관한다. 원본(장변 최대 1200px)을 그대로 쌓지 않는다 —
 * 저장 성격을 "아카이빙"이 아니라 "서비스용 캐싱"으로 유지하려는 것이기도 하다.
 *
 * 표지는 **폭**, 책등은 **높이**로 건다. 책등은 폭이 원래 좁아(44~127px)
 * 폭으로 걸면 아무것도 줄지 않고 1200px 높이가 그대로 남는다.
 */
const COVER_FIT = { width: 500 };
const SPINE_FIT = { height: 600 };

const BUCKET = 'book-covers';

/** "이미지 없음" 플레이스홀더 지문 — 크기와 바이트가 모두 같아야 없는 것으로 본다 */
const PLACEHOLDER = { width: 420, height: 600, bytes: 4975 };

// ─── 인자 ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(name);
const getOption = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const DRY_RUN = hasFlag('--dry-run');
/** 이미 끝난 행까지 다시 처리한다. 스크립트를 고친 뒤 되돌릴 때 쓴다. */
const FORCE = hasFlag('--force');
const LIMIT = Number(getOption('--limit', '0')) || null;
const ENV_FILE = getOption('--env', 'apps/page0127/.env.local');

// ─── 환경 ──────────────────────────────────────────────────────────────

const loadEnv = (file) => {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) {
    console.error(`환경 파일을 찾을 수 없습니다: ${full}`);
    process.exit(1);
  }
  return Object.fromEntries(
    fs
      .readFileSync(full, 'utf8')
      .split('\n')
      .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
      .map((line) => {
        const i = line.indexOf('=');
        return [
          line.slice(0, i).trim(),
          line
            .slice(i + 1)
            .trim()
            .replace(/^['"]|['"]$/g, ''),
        ];
      })
  );
};

const env = loadEnv(ENV_FILE);

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'YES24_API_KEY'];
const missing = required.filter((key) => !env[key]);
if (missing.length) {
  console.error(`환경변수가 없습니다: ${missing.join(', ')}`);
  process.exit(1);
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── 공급자 조회 ────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 저장된 식별자를 YES24가 받는 ISBN13으로 바꾼다.
 *
 * **운영 DB의 isbn 컬럼은 ISBN13이 아니다.** 알라딘 시절 응답의 `isbn` 필드를 그대로
 * 넣어 왔기 때문이다. 2026-09-28 실측(164권):
 *
 *   ISBN13   68권  그대로 쓴다
 *   ISBN10   26권  978 + 앞 9자리 + 체크digit 재계산으로 변환된다
 *   K코드    70권  알라딘 내부 ID다. ISBN이 아니라 계산으로 못 바꾼다
 *
 * K코드는 알라딘에 물어봐야만 진짜 ISBN13을 알 수 있었다. 알라딘 폴백을 걷어낸 지금은
 * `unresolved` 로 떨어지고, 저장된 URL 에서 이미지만 건지는 경로로 간다.
 * (K코드 70권은 알라딘이 살아 있을 때 이미 전부 처리했다.)
 */
const isbn10To13 = (isbn10) => {
  const core = '978' + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  return core + String((10 - (sum % 10)) % 10);
};

const resolveIsbn13 = (stored) => {
  const value = (stored ?? '').trim();

  if (/^97[89]\d{10}$/.test(value)) return { isbn13: value, via: 'stored' };
  if (/^\d{9}[\dX]$/i.test(value)) return { isbn13: isbn10To13(value), via: 'isbn10' };

  return { isbn13: null, via: 'unresolved' };
};

/** YES24 상세 조회. 없으면 null, 실패하면 throw */
const fetchYes24 = async (isbn) => {
  const url =
    'https://apis.yes24.com/v1/goods/itemDetail?' +
    new URLSearchParams({ searchType: 'ISBN13', query: isbn, detail: 'Y' });

  const res = await fetch(url, { headers: { 'X-Api-Key': env.YES24_API_KEY } });

  // 없는 ISBN 은 404 로 온다 — 장애가 아니다
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`YES24 HTTP ${res.status}`);

  const body = await res.json();
  // HTTP 200 이어도 success:false 일 수 있다
  if (!body.success || !body.data) throw new Error(`YES24: ${body.message}`);

  return body.data.items?.[0] ?? null;
};

// ─── 이미지 ────────────────────────────────────────────────────────────

/**
 * 이미지를 받아 "실제로 있는 이미지인지" 판정한다.
 *
 * ⚠️ YES24 는 이미지가 없어도 404 가 아니라 **200 + 420x600 회색 플레이스홀더**를
 * 준다. 상태코드로 판정하면 전부 통과해서 책장이 회색 네모로 채워진다.
 * 크기와 바이트 길이를 함께 본다 — 420x600 짜리 진짜 표지가 있을 수 있어서다.
 */
const downloadImage = async (url) => {
  const res = await fetch(url);
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };

  const buffer = Buffer.from(await res.arrayBuffer());

  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    return { ok: false, reason: '이미지로 읽을 수 없음' };
  }

  const isPlaceholder =
    meta.width === PLACEHOLDER.width &&
    meta.height === PLACEHOLDER.height &&
    buffer.length === PLACEHOLDER.bytes;

  if (isPlaceholder) return { ok: false, reason: '플레이스홀더(이미지 없음)' };

  return { ok: true, buffer, width: meta.width, height: meta.height };
};

/** 화면에 쓰는 크기로 줄인다. 원본보다 크게 늘리지는 않는다. */
const resize = (buffer, fit) =>
  sharp(buffer)
    .resize({ ...fit, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

const upload = async (objectPath, buffer) => {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, buffer, { contentType: 'image/jpeg', upsert: true });

  if (error) throw new Error(`업로드 실패: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
};

/** 한 종류(표지/책등/뒷표지)를 받아서 줄이고 올린다. 없으면 null. */
const syncImage = async (sourceUrl, objectPath, fit) => {
  const got = await downloadImage(sourceUrl);
  if (!got.ok) return { url: null, reason: got.reason };

  if (DRY_RUN) {
    return { url: `(dry-run) ${objectPath}`, reason: `${got.width}x${got.height}` };
  }

  const resized = await resize(got.buffer, fit);
  return { url: await upload(objectPath, resized), reason: `${got.width}x${got.height}` };
};

// ─── 본 작업 ───────────────────────────────────────────────────────────

const yes24ImageUrl = (itemId, kind) =>
  kind === 'cover'
    ? `https://image.yes24.com/goods/${itemId}/XL`
    : `https://image.yes24.com/goods/${itemId}/${kind === 'spine' ? 'SIDE' : 'BACK'}/XL`;

const stats = {
  total: 0,
  done: 0,
  yes24: 0,
  notFound: 0,
  failed: 0,
  covers: 0,
  spines: 0,
  backs: 0,
  thickness: 0,
  rescued: 0,
  resolved: {},
};
const failures = [];

/**
 * YES24 가 못 찾았을 때, DB에 이미 있는 외부 URL 로 이미지만 건져 온다.
 *
 * 메타데이터는 포기하고 이미지만 옮긴다. `source` 도 건드리지 않는다 —
 * 어디서 왔는지는 그대로 사실이고, 바뀐 건 "어디에 보관하는가" 뿐이다.
 *
 * 옮길 게 하나도 없으면 `false` 를 돌려줘서 호출부가 실패로 세게 한다.
 */
const rescueFromStoredUrls = async (row) => {
  const isExternal = (url) =>
    typeof url === 'string' && /^https?:\/\//.test(url) && !url.includes('supabase.co');

  const [cover, spine] = await Promise.all([
    isExternal(row.cover_image)
      ? syncImage(row.cover_image, `${row.isbn}/cover.jpg`, COVER_FIT)
      : { url: null },
    isExternal(row.spine_image)
      ? syncImage(row.spine_image, `${row.isbn}/spine.jpg`, SPINE_FIT)
      : { url: null },
  ]);

  if (!cover.url && !spine.url) return false;

  stats.rescued += 1;
  if (cover.url) stats.covers += 1;
  if (spine.url) stats.spines += 1;

  console.log(
    `  · ${row.isbn} ${(row.title ?? '').slice(0, 26).padEnd(26)} ` +
      `표지:${cover.url ? 'O' : 'X'} 책등:${spine.url ? 'O' : 'X'} 뒷:-  [기존 URL 에서 건짐]`
  );

  if (DRY_RUN) return true;

  const patch = { cover_synced_at: new Date().toISOString() };
  if (cover.url) patch.cover_image = cover.url;
  if (spine.url) patch.spine_image = spine.url;

  const { error } = await supabase
    .from('global_books')
    .update(patch)
    .eq('isbn', row.isbn);
  if (error) throw new Error(`global_books 갱신 실패: ${error.message}`);

  const booksPatch = {};
  if (cover.url) booksPatch.cover_image = cover.url;
  if (spine.url) booksPatch.spine_image = spine.url;

  const { error: booksError } = await supabase
    .from('books')
    .update(booksPatch)
    .eq('isbn', row.isbn);
  if (booksError) throw new Error(`books 갱신 실패: ${booksError.message}`);

  return true;
};

const processRow = async (row) => {
  // 저장된 식별자가 ISBN13이 아닐 수 있다(ISBN10·K코드). ISBN10 은 계산으로 바꾸고,
  // K코드는 풀 방법이 없어 unresolved 로 떨어진다.
  const resolved = resolveIsbn13(row.isbn);
  stats.resolved[resolved.via] = (stats.resolved[resolved.via] ?? 0) + 1;

  const item = resolved.isbn13 ? await fetchYes24(resolved.isbn13) : null;

  if (!item) {
    // 마지막 경로: 공급자가 못 찾아도 **이미 갖고 있는 URL이 살아 있으면 그거라도 옮긴다.**
    //
    // 절판되어 카탈로그에서 내려간 책, ISBN13 을 못 구한 책이 여기 걸린다. API 로는
    // 못 찾지만 CDN 의 이미지 파일은 남아 있는 경우가 있다 — 우리가 원하는 건
    // 메타데이터가 아니라 **이미지를 우리 쪽으로 옮기는 것**이므로 API 가 없어도 된다.
    const rescued = await rescueFromStoredUrls(row);
    if (rescued) return;

    stats.notFound += 1;
    failures.push({ isbn: row.isbn, title: row.title, reason: 'YES24 에 없고 건질 URL 도 없음' });
    return;
  }

  stats.yes24 += 1;
  const itemId = String(item.itemId);

  const [cover, spine, back] = await Promise.all([
    syncImage(yes24ImageUrl(itemId, 'cover'), `${row.isbn}/cover.jpg`, COVER_FIT),
    syncImage(yes24ImageUrl(itemId, 'spine'), `${row.isbn}/spine.jpg`, SPINE_FIT),
    syncImage(yes24ImageUrl(itemId, 'back'), `${row.isbn}/back.jpg`, COVER_FIT),
  ]);

  // 치수를 등록하지 않은 상품은 0 으로 온다. 0 을 저장하면 책장이 두께 0mm 로
  // 그려 선 하나로 사라진다 — 값이 없을 때의 기본 두께와 구분되지 않는다.
  const mm = (value) => (typeof value === 'number' && value > 0 ? value : null);
  const thickness = mm(item.height);

  if (cover.url) stats.covers += 1;
  if (spine.url) stats.spines += 1;
  if (back.url) stats.backs += 1;
  if (thickness !== null) stats.thickness += 1;

  const patch = {
    provider_item_id: itemId,
    sub_title: item.subTitle?.trim() || null,
    source: 'yes24',
    // ⚠️ YES24 는 height 가 두께다. 판형 세로는 length.
    width_mm: mm(item.width),
    height_mm: mm(item.length),
    thickness_mm: thickness,
    cover_synced_at: new Date().toISOString(),
  };

  // 이미지는 받아 온 것만 덮어쓴다 — 실패했다고 기존 URL 을 지우면 화면이 비어 버린다
  if (cover.url) patch.cover_image = cover.url;
  if (spine.url) patch.spine_image = spine.url;
  if (back.url) patch.back_image = back.url;

  console.log(
    `  · ${row.isbn} ${(row.title ?? '').slice(0, 26).padEnd(26)} ` +
      `표지:${cover.url ? 'O' : 'X'} 책등:${spine.url ? 'O' : 'X'} 뒷:${back.url ? 'O' : 'X'} ` +
      `두께:${thickness ?? '-'}mm`
  );

  if (DRY_RUN) return;

  const { error } = await supabase
    .from('global_books')
    .update(patch)
    .eq('isbn', row.isbn);

  if (error) throw new Error(`global_books 갱신 실패: ${error.message}`);

  // 사용자별 books 도 같은 이미지를 들고 있다(비정규화). 화면은 이쪽을 읽는다.
  const booksPatch = {};
  if (cover.url) booksPatch.cover_image = cover.url;
  if (spine.url) booksPatch.spine_image = spine.url;
  if (patch.sub_title) booksPatch.sub_title = patch.sub_title;
  // 책장이 books 를 직접 읽는다 — 두께가 여기 없으면 책등 폭이 기본값으로 떨어진다
  if (thickness !== null) booksPatch.thickness_mm = thickness;

  if (Object.keys(booksPatch).length > 0) {
    const { error: booksError } = await supabase
      .from('books')
      .update(booksPatch)
      .eq('isbn', row.isbn);

    if (booksError) throw new Error(`books 갱신 실패: ${booksError.message}`);
  }
};

const main = async () => {
  console.log(`대상 DB : ${env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(
    `모드    : ${DRY_RUN ? 'DRY RUN (아무것도 쓰지 않음)' : '실제 실행'}` +
      (FORCE ? ' · FORCE (이미 끝난 행도 다시 처리)' : '')
  );
  console.log('');

  // 아직 안 끝난 행만 가져온다 → 중단 후 재실행이 그대로 이어진다
  let query = supabase
    .from('global_books')
    .select('isbn, title, cover_image, spine_image')
    .order('isbn');

  if (!FORCE) query = query.is('cover_synced_at', null);
  if (LIMIT) query = query.limit(LIMIT);

  const { data: rows, error } = await query;
  if (error) {
    console.error('대상 조회 실패:', error.message);
    process.exit(1);
  }

  stats.total = rows.length;
  console.log(`처리할 도서: ${rows.length}권`);
  console.log('');

  for (const row of rows) {
    try {
      await processRow(row);
      stats.done += 1;
    } catch (err) {
      stats.failed += 1;
      failures.push({ isbn: row.isbn, title: row.title, reason: String(err.message ?? err) });
      console.log(`  × ${row.isbn} ${(row.title ?? '').slice(0, 26)} — ${err.message ?? err}`);
    }

    await sleep(REQUEST_INTERVAL_MS);
  }

  console.log('');
  console.log('─'.repeat(60));
  console.log(`처리 대상        ${stats.total}권`);
  console.log(`  YES24 확보     ${stats.yes24}권`);
  console.log(`  기존 URL 에서 건짐 ${stats.rescued}권`);
  console.log(`  찾지 못함      ${stats.notFound}권`);
  console.log(`  실패           ${stats.failed}권`);
  console.log('');
  console.log(`표지 ${stats.covers} · 책등 ${stats.spines} · 뒷표지 ${stats.backs} · 두께 ${stats.thickness}`);
  console.log('');
  // 저장된 식별자가 무엇이었는지 — unresolved 는 대부분 알라딘 K코드다
  const viaLabel = {
    stored: 'ISBN13 그대로',
    isbn10: 'ISBN10 → 변환',
    unresolved: 'ISBN13을 못 구함',
  };
  Object.entries(stats.resolved).forEach(([via, n]) =>
    console.log(`  ${(viaLabel[via] ?? via).padEnd(26)} ${n}권`)
  );

  if (failures.length) {
    console.log('');
    console.log(`처리하지 못한 ${failures.length}권 (다시 실행하면 재시도한다):`);
    failures.slice(0, 30).forEach((f) => console.log(`  ${f.isbn}  ${f.title ?? ''} — ${f.reason}`));
    if (failures.length > 30) console.log(`  ... 외 ${failures.length - 30}권`);
  }
};

await main();
