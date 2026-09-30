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
 *   node scripts/backfill-book-images.mjs --aladin-urls    남은 알라딘 이미지 주소만 옮긴다
 *   node scripts/backfill-book-images.mjs --sync-books-source  books 의 빈 출처를 채운다
 *   node scripts/backfill-book-images.mjs --rematch-aladin  알라딘 출처 책을 제목으로 다시 찾는다
 *   node scripts/backfill-book-images.mjs --reidentify 옛[,옛]=새ISBN13  판본을 바로잡는다
 *   node scripts/backfill-book-images.mjs --adopt-orphans  global_books 짝이 없는 책에 짝을 만든다
 *
 * `--aladin-urls` 는 위의 백필과 별개 모드다. 백필은 "받아 온 것만 덮어쓴다" 규칙이라
 * YES24 에 책등이 없는 책은 알라딘 책등 주소가 그대로 남았다(2026-09-30 실측:
 * global_books 20 · books 22 · book_recommendations 35). 알라딘 이미지 서버에 기대는
 * 이 주소들을 우리 Storage 로 옮긴다. 옮기지 못한 칸은 비운다.
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
const ALADIN_URLS = hasFlag('--aladin-urls');
const SYNC_BOOKS_SOURCE = hasFlag('--sync-books-source');
const REMATCH_ALADIN = hasFlag('--rematch-aladin');
/** `옛식별자=새ISBN13` — 잘못된 판본으로 들어간 책을 바로잡는다 */
const REIDENTIFY = getOption('--reidentify', null);
const ADOPT_ORPHANS = hasFlag('--adopt-orphans');
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

  await applyYes24Item(row, item);
};

/**
 * YES24 상품 하나를 우리 행에 입힌다 — 이미지·치수·상품번호·출처.
 *
 * `row.isbn` 은 우리 쪽 식별자(PK)라 바꾸지 않는다. ISBN10·K코드로 저장된 책도
 * 식별자는 그대로 두고 내용만 YES24 로 채운다.
 */
const applyYes24Item = async (row, item) => {
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
  //
  // 출처·상품번호도 반드시 같이 적는다. 2026-09-28 백필은 이걸 빠뜨려서 books 160행 중
  // 158행의 출처가 비었고, 내 서재 책 상세에서 출처 표기(약관 의무)가 사라졌다.
  const booksPatch = { source: 'yes24', provider_item_id: itemId };
  if (cover.url) booksPatch.cover_image = cover.url;
  if (spine.url) booksPatch.spine_image = spine.url;
  if (patch.sub_title) booksPatch.sub_title = patch.sub_title;
  // 책장이 books 를 직접 읽는다 — 두께가 여기 없으면 책등 폭이 기본값으로 떨어진다
  if (thickness !== null) booksPatch.thickness_mm = thickness;

  const { error: booksError } = await supabase
    .from('books')
    .update(booksPatch)
    .eq('isbn', row.isbn);

  if (booksError) throw new Error(`books 갱신 실패: ${booksError.message}`);
};

// ─── 알라딘 이미지 주소 옮기기 (--aladin-urls) ────────────────────────

/**
 * 알라딘 이미지 주소가 남아 있을 수 있는 칸들.
 * 책등만 높이로 줄인다 — 이유는 COVER_FIT / SPINE_FIT 주석 참고.
 */
const ALADIN_COLUMNS = [
  { table: 'global_books', column: 'cover_image', fit: COVER_FIT },
  { table: 'global_books', column: 'spine_image', fit: SPINE_FIT },
  { table: 'global_books', column: 'back_image', fit: COVER_FIT },
  { table: 'books', column: 'cover_image', fit: COVER_FIT },
  { table: 'books', column: 'spine_image', fit: SPINE_FIT },
  { table: 'book_recommendations', column: 'cover_image', fit: COVER_FIT },
];

/**
 * 행이 아니라 **주소** 단위로 옮긴다.
 *
 * 같은 책의 표지가 global_books·books(사용자 수만큼)·추천에 똑같이 들어 있다.
 * 주소 하나를 한 번만 받아 올리고, 그 주소를 쓰던 칸을 전부 한꺼번에 바꾼다.
 *
 * 저장 경로는 알라딘 경로를 그대로 따른다(`aladin/product/.../x.jpg`).
 * 다시 돌려도 같은 파일에 덮어쓸 뿐이라 중단 후 재실행이 안전하다.
 */
const migrateAladinUrls = async () => {
  /** url → { fit, refs: [{ table, column }] } */
  const targets = new Map();

  for (const { table, column, fit } of ALADIN_COLUMNS) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .ilike(column, '%image.aladin.co.kr%');
    if (error) throw new Error(`${table}.${column} 조회 실패: ${error.message}`);

    for (const row of data) {
      const url = row[column];
      const target = targets.get(url) ?? { fit, refs: [] };
      // 같은 테이블·칸은 update 한 번이 모든 행을 바꾸므로 한 번만 적는다
      if (!target.refs.some((ref) => ref.table === table && ref.column === column)) {
        target.refs.push({ table, column });
      }
      targets.set(url, target);
    }
  }

  console.log(`옮길 알라딘 주소: ${targets.size}개`);
  console.log('');

  const result = { moved: 0, cleared: 0, skipped: 0 };

  for (const [url, { fit, refs }] of targets) {
    const objectPath = `aladin${new URL(url).pathname}`;
    const where = refs.map((ref) => `${ref.table}.${ref.column}`).join(', ');

    let synced;
    try {
      synced = await syncImage(url, objectPath, fit);
    } catch (err) {
      // 네트워크 오류는 "이미지가 없다"는 뜻이 아니다 — 비우지 않고 다음 실행에 맡긴다
      result.skipped += 1;
      console.log(`  ? ${objectPath}  (${err.message ?? err} — 건너뜀)  ${where}`);
      continue;
    }

    // 서버 쪽 일시 장애(5xx)도 마찬가지로 건너뛴다
    if (!synced.url && /^HTTP 5\d\d$/.test(synced.reason)) {
      result.skipped += 1;
      console.log(`  ? ${objectPath}  (${synced.reason} — 건너뜀)  ${where}`);
      continue;
    }

    // 확실히 없는 주소(4xx·이미지 아님)는 비운다 — 도메인을 막으면 어차피 깨질 주소다.
    // 비워 두면 책장은 제목이 적힌 기본 책등, 추천은 표지 없이 그려진다.
    const nextUrl = synced.url;

    if (nextUrl) result.moved += 1;
    else result.cleared += 1;

    console.log(`  ${nextUrl ? '→' : '×'} ${objectPath}  (${synced.reason})  ${where}`);

    if (!DRY_RUN) {
      for (const { table, column } of refs) {
        const { error } = await supabase
          .from(table)
          .update({ [column]: nextUrl })
          .eq(column, url);
        if (error) throw new Error(`${table}.${column} 갱신 실패: ${error.message}`);
      }
    }

    await sleep(REQUEST_INTERVAL_MS);
  }

  console.log('');
  console.log('─'.repeat(60));
  console.log(`Storage 로 옮김  ${result.moved}개`);
  console.log(`못 옮겨 비움     ${result.cleared}개`);
  console.log(`건너뜀(재실행)   ${result.skipped}개`);
};

// ─── books 출처 채우기 (--sync-books-source) ──────────────────────────

/**
 * global_books 의 출처·상품번호를 같은 isbn 의 books 로 복사한다.
 *
 * 화면(내 서재 책 상세)은 books 를 읽는데, 2026-09-28 백필이 global_books 에만
 * 출처를 적었다. 이미 값이 있는 books 행은 건드리지 않는다(`source is null` 만).
 */
const syncBooksSource = async () => {
  const { data: rows, error } = await supabase
    .from('global_books')
    .select('isbn, title, source, provider_item_id')
    .not('source', 'is', null)
    .order('isbn');
  if (error) throw new Error(`global_books 조회 실패: ${error.message}`);

  let updated = 0;

  for (const row of rows) {
    const { count, error: countError } = await supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('isbn', row.isbn)
      .is('source', null);
    if (countError) throw new Error(`books 조회 실패: ${countError.message}`);
    if (!count) continue;

    console.log(`  · ${row.isbn} ${(row.title ?? '').slice(0, 26).padEnd(26)} ${row.source} × ${count}행`);
    updated += count;

    if (DRY_RUN) continue;

    const { error: updateError } = await supabase
      .from('books')
      .update({ source: row.source, provider_item_id: row.provider_item_id })
      .eq('isbn', row.isbn)
      .is('source', null);
    if (updateError) throw new Error(`books 갱신 실패: ${updateError.message}`);
  }

  console.log('');
  console.log('─'.repeat(60));
  console.log(`출처를 채운 books  ${updated}행`);
};

// ─── 알라딘 출처 책 다시 찾기 (--rematch-aladin) ─────────────────────

/** 비교용 정규화 — 공백·문장부호·대소문자 차이를 없앤다 */
const normalizeText = (value) =>
  (value ?? '').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');

/**
 * 첫 저자 이름만 뽑는다.
 * 알라딘 `한강 (지은이), 홍길동 (옮긴이)` / YES24 `한강 저/홍길동 역` 처럼 표기가 달라
 * 첫 이름에서 역할 표기(`저`·`역` 등)를 떼고 견준다.
 */
const firstAuthor = (value) =>
  normalizeText(
    (value ?? '')
      .split(/[(,/]/)[0]
      .trim()
      .replace(/\s+(저|지음|글|역|옮김|엮음|편저|편|그림|원작)$/, '')
  );

/**
 * YES24 검색 결과에서 **확실히 같은 책**만 고른다.
 *
 * 제목과 첫 저자가 모두 일치해야 한다. 알라딘은 부제를 제목에 ` - 부제` 로 붙였으므로
 * YES24 쪽은 "제목"과 "제목+부제" 둘 다 견준다. 후보가 둘 이상이면(개정판 등)
 * 고르지 않는다 — 틀린 책을 붙이면 표지·출처가 조용히 어긋난다.
 */
const pickSameBook = (row, items) => {
  const title = normalizeText(row.title);
  const author = firstAuthor(row.author);

  const matches = items.filter((item) => {
    if (!item.isbn13) return false; // 세트 상품
    const titles = [normalizeText(item.title), normalizeText(`${item.title}${item.subTitle ?? ''}`)];
    return titles.includes(title) && author !== '' && firstAuthor(item.author) === author;
  });

  return matches.length === 1 ? matches[0] : null;
};

const searchYes24 = async (query) => {
  const url =
    'https://apis.yes24.com/v1/goods/itemList?' +
    new URLSearchParams({ query, category: 'BOOK', page: '1', pageSize: '20' });

  const res = await fetch(url, { headers: { 'X-Api-Key': env.YES24_API_KEY } });
  if (!res.ok) throw new Error(`YES24 HTTP ${res.status}`);

  const body = await res.json();
  if (!body.success || !body.data) throw new Error(`YES24: ${body.message}`);

  return body.data.items ?? [];
};

/**
 * YES24 가 ISBN 으로 못 찾은(= 출처가 아직 알라딘인) 책을 제목·저자로 다시 찾는다.
 *
 * 찾으면 백필과 같은 경로(`applyYes24Item`)로 이미지·치수·상품번호·출처를 채운다.
 * 못 찾은 책은 출처 "알라딘"으로 남는다 — 사실이고, 알라딘 웹사이트 링크도 계속 산다.
 */
const rematchAladin = async () => {
  const { data: rows, error } = await supabase
    .from('global_books')
    .select('isbn, title, author, cover_image, spine_image')
    .eq('source', 'aladin')
    .order('isbn');
  if (error) throw new Error(`global_books 조회 실패: ${error.message}`);

  console.log(`출처가 알라딘인 책: ${rows.length}권`);
  console.log('');

  let matched = 0;

  for (const row of rows) {
    const found = pickSameBook(row, await searchYes24(`${row.title} ${firstAuthor(row.author)}`));

    if (!found) {
      console.log(`  × ${row.isbn} ${row.title} / ${row.author} — 확실히 같은 책을 못 찾음`);
      await sleep(REQUEST_INTERVAL_MS);
      continue;
    }

    // 이미 같은 ISBN13 이 다른 행으로 있으면 붙이지 않는다 — 한 책이 두 행이 된다(#137)
    const { count } = await supabase
      .from('global_books')
      .select('isbn', { count: 'exact', head: true })
      .eq('isbn', found.isbn13);
    if (count) {
      console.log(`  ! ${row.isbn} ${row.title} — ${found.isbn13} 이 이미 다른 행으로 있음(중복 병합 필요)`);
      continue;
    }

    console.log(`  = ${row.isbn} ${row.title} / ${row.author}`);
    console.log(`    → YES24 ${found.itemId} ${found.title} / ${found.author} (${found.isbn13})`);

    // 검색 결과에는 치수가 없다 — 상세로 다시 받는다
    const detail = (await fetchYes24(found.isbn13)) ?? found;
    await applyYes24Item(row, detail);
    matched += 1;

    await sleep(REQUEST_INTERVAL_MS);
  }

  console.log('');
  console.log('─'.repeat(60));
  console.log(`YES24 로 바꿈  ${matched}권`);
  console.log(`알라딘으로 남음 ${rows.length - matched}권`);
};

// ─── 판본 바로잡기 (--reidentify 옛=새ISBN13) ───────────────────────

/** YES24 `20130615` → 저장 형식 `2013-06-15` (앱의 normalizePubDate 와 같은 규칙) */
const toIsoDate = (value) =>
  /^\d{8}$/.test(value ?? '')
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
    : null;

/**
 * YES24 상품에서 '책 자체' 정보를 만든다. 사용자 기록(평점·완독일·리뷰)은 여기 없다.
 * 앱의 `mapYes24Book` 과 같은 규칙이다.
 */
const toBookFields = (item, isbn) => ({
  isbn,
  title: item.title ?? '',
  sub_title: item.subTitle?.trim() || null,
  author: item.author ?? '',
  publisher: item.publisher ?? '',
  pub_date: toIsoDate(item.publishDate),
  description: item.contentDetail?.bookIntroduction ?? '',
  category: item.goodsSortNm ?? '',
  provider_item_id: String(item.itemId),
  source: 'yes24',
});

/**
 * 다른 판본으로 잘못 들어간 책을 올바른 판본으로 바꾼다.
 *
 * ⚠️ **행을 새로 만들고 옛 행을 지우면 안 된다.** `book_likes`·`book_comments` 가
 * `global_books.id` 를 참조하고 ON DELETE CASCADE 라, 옛 행을 지우는 순간 이 책의
 * 좋아요·책 댓글이 함께 사라진다. 그래서 **같은 행의 isbn 을 제자리에서 바꾼다** —
 * id 가 그대로라 모든 연결이 유지된다.
 *
 * 랭킹 스냅샷은 옮기지 않는다. 날짜별 과거 기록이다(#137 과 같은 원칙).
 *
 * 중간에 끊겨도 다시 돌리면 된다 — 옛 isbn 이 이미 없고 새 isbn 이 있으면
 * global_books 단계를 건너뛰고 나머지를 이어서 한다.
 */
const reidentify = async (spec) => {
  // 옛 식별자는 쉼표로 여러 개 줄 수 있다 — 같은 책이 서로 다른 판본으로 갈라져
  // global_books 와 books 에 따로 들어간 경우(2026-07-19 일괄 등록의 『변신』)
  const [oldPart, newIsbn] = spec.split('=').map((value) => value?.trim());
  const oldIsbns = (oldPart ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  if (!oldIsbns.length || !/^97[89]\d{10}$/.test(newIsbn ?? '') || oldIsbns.includes(newIsbn)) {
    throw new Error('형식: --reidentify 옛식별자[,옛식별자]=새ISBN13');
  }

  const item = await fetchYes24(newIsbn);
  if (!item) throw new Error(`YES24 에 ${newIsbn} 이 없습니다`);

  const itemId = String(item.itemId);
  console.log(`새 판본: YES24 ${itemId} ${item.title} / ${item.author} / ${item.publisher} (${item.publishDate})`);

  const findGlobal = async (isbn) => {
    const { data, error } = await supabase
      .from('global_books')
      .select('id, isbn, title, author, publisher, cover_image, spine_image')
      .eq('isbn', isbn)
      .maybeSingle();
    if (error) throw new Error(`global_books 조회 실패: ${error.message}`);
    return data;
  };

  const oldRows = (await Promise.all(oldIsbns.map(findGlobal))).filter(Boolean);
  const newRow = await findGlobal(newIsbn);

  // global_books 행이 둘 이상 남으면 한 책이 두 행이 된다 — 병합(#137)이 필요한 상황이라
  // 여기서 다루지 않는다. 좋아요·책 댓글이 행 id 에 붙어 있어 함부로 지울 수 없다.
  if (oldRows.length + (newRow ? 1 : 0) > 1) {
    throw new Error(
      `global_books 에 행이 둘 이상 있습니다(${[...oldRows, newRow].filter(Boolean).map((row) => row.isbn).join(', ')}) — 병합 필요`
    );
  }
  if (!oldRows.length && !newRow) {
    throw new Error(`${oldIsbns.join(', ')} 중 어느 것도 global_books 에 없습니다`);
  }

  const [oldRow] = oldRows;

  if (oldRow) {
    console.log(`옛 판본: ${oldRow.isbn} ${oldRow.title} / ${oldRow.author} / ${oldRow.publisher}`);
  } else {
    console.log('global_books 는 이미 바뀌어 있다 — 나머지 단계만 이어서 한다');
  }
  console.log('');

  const bookFields = toBookFields(item, newIsbn);

  // 1) global_books — 같은 행(id 유지)의 isbn 과 책 정보를 바꾼다
  if (oldRow) {
    console.log(`  global_books  1행 (id ${oldRow.id} 유지)`);
    if (!DRY_RUN) {
      const { error } = await supabase.from('global_books').update(bookFields).eq('id', oldRow.id);
      if (error) throw new Error(`global_books 갱신 실패: ${error.message}`);
    }
  }

  // 2) isbn 을 들고 있는 나머지 — 사용자 책은 책 정보까지, 나머지는 isbn 만
  const refs = [
    { table: 'books', column: 'isbn', patch: bookFields },
    { table: 'reading_records', column: 'book_isbn', patch: { book_isbn: newIsbn } },
    { table: 'book_recommendations', column: 'isbn', patch: { isbn: newIsbn } },
    { table: 'mutual_recommendations', column: 'isbn', patch: { isbn: newIsbn } },
  ];

  for (const { table, column, patch } of refs) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .in(column, oldIsbns);

    // 환경마다 스키마가 다르다(로컬 reading_records 에는 book_isbn 이 없다) — 없으면 건너뛴다
    if (error) {
      console.log(`  ${table}.${column}  건너뜀 (${error.message})`);
      continue;
    }

    console.log(`  ${table}.${column}  ${count ?? 0}행`);
    if (DRY_RUN || !count) continue;

    const { error: updateError } = await supabase.from(table).update(patch).in(column, oldIsbns);
    if (updateError) throw new Error(`${table} 갱신 실패: ${updateError.message}`);
  }

  console.log('');

  // 3) 이미지·치수는 백필과 같은 경로로 — 새 isbn 기준 Storage 경로에 올라간다.
  //    dry-run 에서는 아직 isbn 이 안 바뀌었으므로 받아 보기만 한다.
  await applyYes24Item({ isbn: newIsbn, title: item.title }, item);
};

// ─── 짝 없는 사용자 책 (--adopt-orphans) ─────────────────────────────

/**
 * global_books 에 짝이 없는 books 에 짝을 만들어 준다.
 *
 * 2026-07-19 일괄 등록에서 books 와 global_books 가 서로 다른 식별자로 들어간 책이
 * 있다(『기록이라는 세계』 등). 짝이 없으면 백필·출처 채우기 어디에도 걸리지 않아
 * 출처 표기도, Storage 이미지도 없이 남는다.
 *
 * 식별자는 사용자 책의 것을 그대로 쓴다(books.isbn 을 바꾸지 않는다).
 * YES24 에서 못 찾으면 만들지 않고 보고만 한다 — 비어 있는 행을 지어내지 않는다.
 */
const adoptOrphans = async () => {
  // 행 수가 수백 단위라 둘 다 받아 와서 비교한다(PostgREST 는 NOT EXISTS 조인이 없다)
  const [{ data: books, error: booksError }, { data: globals, error: globalsError }] =
    await Promise.all([
      supabase.from('books').select('isbn, title').limit(5000),
      supabase.from('global_books').select('isbn').limit(5000),
    ]);
  if (booksError) throw new Error(`books 조회 실패: ${booksError.message}`);
  if (globalsError) throw new Error(`global_books 조회 실패: ${globalsError.message}`);

  const known = new Set(globals.map((row) => row.isbn));
  const orphans = new Map();
  for (const row of books) {
    if (row.isbn && !known.has(row.isbn)) orphans.set(row.isbn, row.title);
  }

  console.log(`짝 없는 사용자 책: ${orphans.size}권`);
  console.log('');

  let adopted = 0;

  for (const [isbn, title] of orphans) {
    const { isbn13 } = resolveIsbn13(isbn);
    const item = isbn13 ? await fetchYes24(isbn13) : null;

    if (!item) {
      console.log(`  × ${isbn} ${title} — YES24 에서 못 찾음(그대로 둠)`);
      await sleep(REQUEST_INTERVAL_MS);
      continue;
    }

    console.log(`  + ${isbn} ${title} → YES24 ${item.itemId} ${item.title} / ${item.author}`);

    if (!DRY_RUN) {
      const { error } = await supabase.from('global_books').insert(toBookFields(item, isbn));
      if (error) throw new Error(`global_books 추가 실패(${isbn}): ${error.message}`);
    }

    // 이미지·치수·books 출처는 백필과 같은 경로로 채운다
    await applyYes24Item({ isbn, title }, item);
    adopted += 1;

    await sleep(REQUEST_INTERVAL_MS);
  }

  console.log('');
  console.log('─'.repeat(60));
  console.log(`짝을 만든 책  ${adopted}권`);
  console.log(`못 찾은 책    ${orphans.size - adopted}권`);
};

const main = async () => {
  console.log(`대상 DB : ${env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(
    `모드    : ${DRY_RUN ? 'DRY RUN (아무것도 쓰지 않음)' : '실제 실행'}` +
      (FORCE ? ' · FORCE (이미 끝난 행도 다시 처리)' : '') +
      (ALADIN_URLS ? ' · 알라딘 이미지 주소 옮기기' : '')
  );
  console.log('');

  if (ALADIN_URLS) {
    await migrateAladinUrls();
    return;
  }
  if (SYNC_BOOKS_SOURCE) {
    await syncBooksSource();
    return;
  }
  if (REMATCH_ALADIN) {
    await rematchAladin();
    return;
  }
  if (REIDENTIFY) {
    await reidentify(REIDENTIFY);
    return;
  }
  if (ADOPT_ORPHANS) {
    await adoptOrphans();
    return;
  }

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
