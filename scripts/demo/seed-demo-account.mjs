#!/usr/bin/env node
/**
 * 리뷰어용 체험 계정 만들기·되돌리기
 *
 * 사용법:
 *   node scripts/demo/seed-demo-account.mjs --local                  로컬 Supabase(supabase start)
 *   node scripts/demo/seed-demo-account.mjs --env apps/page0127/.env.local
 *   node scripts/demo/seed-demo-account.mjs --env .env.production --yes  운영 (확인 질문 생략)
 *
 * 필요한 환경변수 (--env 파일 안에):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   DEMO_ACCOUNT_EMAIL   체험 계정 이메일 — 앱의 "체험 계정으로 둘러보기" 버튼도 같은 값을 쓴다.
 *                        메일은 보내지 않으니 받을 수 없는 주소여도 된다(예: demo@page0127.test).
 *
 * 하는 일 (몇 번을 돌려도 같은 결과 = 멱등):
 *   1) 체험 계정이 없으면 만든다. app_metadata.demo = true 를 붙인다.
 *      → JWT 에 실려 proxy·DB 트리거가 "체험 계정의 쓰기"를 알아본다.
 *   2) 프로필을 맞춘다: 닉네임·소개·독서 목표, onboarded_at(온보딩 건너뜀), is_demo = true.
 *   3) 체험 계정의 책·메모·문장·취향 분석을 지우고 아래 목록으로 다시 넣는다.
 *
 * 왜 책을 카탈로그(global_books)에 있는 것만 넣나:
 *   books 트리거(apply_book_catalog_review)는 카탈로그에 없는 ISBN 이 들어오면
 *   "직접 등록·검수 대기" 카탈로그 행을 새로 만든다. 그러면 어드민 검수함에 체험 계정 책이 쌓인다.
 *   그래서 승인된 카탈로그 행이 없는 책은 건너뛰고 알려 준다.
 *
 * 체험 계정은 읽기 전용이라(20261121000100_demo_account.sql) 누가 눌러도 데이터가 바뀌지 않는다.
 * 그래서 주기적으로 돌릴 필요는 없다. 책 목록을 바꾸고 싶을 때만 다시 돌린다.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getOption = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};

// ─── 환경 ──────────────────────────────────────────────────────────────

const loadEnvFile = (file) => {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) {
    console.error(`환경 파일을 찾을 수 없어요: ${full}`);
    process.exit(1);
  }
  return Object.fromEntries(
    fs
      .readFileSync(full, "utf8")
      .split("\n")
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [
          line.slice(0, i).trim(),
          line
            .slice(i + 1)
            .trim()
            .replace(/^['"]|['"]$/g, ""),
        ];
      }),
  );
};

/** --local: `supabase status` 에서 주소·키를 읽는다(.env 를 믿지 않는다) */
const loadLocalEnv = () => {
  const raw = execSync("supabase status -o json", {
    stdio: ["ignore", "pipe", "ignore"],
  }).toString();
  const status = JSON.parse(raw.slice(raw.indexOf("{")));
  return {
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    DEMO_ACCOUNT_EMAIL: process.env.DEMO_ACCOUNT_EMAIL ?? "demo@page0127.test",
  };
};

const env = hasFlag("--local")
  ? loadLocalEnv()
  : loadEnvFile(getOption("--env") ?? "apps/page0127/.env.local");

const missing = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DEMO_ACCOUNT_EMAIL",
].filter((key) => !env[key]);
if (missing.length) {
  console.error(`환경변수가 없어요: ${missing.join(", ")}`);
  process.exit(1);
}

const DEMO_EMAIL = env.DEMO_ACCOUNT_EMAIL.trim().toLowerCase();
const DEMO_USERNAME = "demo_reader";

// 지금 어느 DB 를 건드리는지 눈으로 확인하고 진행한다(운영 ref 를 잘못 고르는 사고 방지)
const target = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host;
const isLocal = /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(target);
if (!isLocal && !hasFlag("--yes")) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(
    `${target} 에 체험 계정(${DEMO_EMAIL})을 만들고 책을 다시 채웁니다. 계속할까요? (y/N) `,
  );
  rl.close();
  if (answer.trim().toLowerCase() !== "y") {
    console.log("멈췄어요.");
    process.exit(0);
  }
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ─── 체험 서재 ─────────────────────────────────────────────────────────
// 기준일 2026-11. 완독 15·읽는 중 3·읽고 싶은 2. 소설·에세이·인문·자기계발·고전을 섞어
// 독서 균형·월별 기록·평점 분포·취향 분석이 그럴듯하게 보이는 양으로 골랐다.
// 문장(quote)은 출판사가 공개한 「책 속에서」 문구다(오늘의 문장 풀과 같은 출처).
const BOOKS = [
  {
    isbn: "9788932917207",
    status: "completed",
    start: "2025-11-10",
    done: "2025-11-30",
    rating: 4,
    review: "어른이 되어 다시 읽으니 애티커스의 침착함이 더 크게 보였다.",
    quote: {
      page: 64,
      text: "누군가를 정말로 이해하려고 한다면 그 사람의 입장에서 생각해야 하는 거야.",
    },
  },
  {
    isbn: "9788931021295",
    status: "completed",
    start: "2025-12-20",
    done: "2025-12-24",
    rating: 5,
    lifeBook: true,
    readCount: 3,
    review: "다시 읽을 때마다 다른 장면에서 멈춘다. 올해는 여우였다.",
  },
  {
    isbn: "9791162540640",
    status: "completed",
    start: "2026-01-02",
    done: "2026-01-12",
    rating: 4,
    review: "1%씩 나아진다는 말이 처음으로 계산처럼 느껴졌다.",
  },
  {
    isbn: "9791190090018",
    status: "completed",
    start: "2026-01-20",
    done: "2026-02-03",
    rating: 5,
    lifeBook: true,
    review: "SF로 시작해서 그리움으로 끝나는 단편집. 마지막 장을 덮고 한참 앉아 있었다.",
    memo: "「스펙트럼」의 루이가 남긴 기록 장면. 언어가 달라도 마음은 옮겨진다는 것.\n다음엔 「관내분실」을 다시 읽어 볼 것.",
  },
  {
    isbn: "9791161572055",
    status: "completed",
    start: "2026-02-10",
    done: "2026-02-21",
    rating: 4,
    review: "따뜻한 이야기가 필요했던 주에 딱 맞았다.",
  },
  {
    isbn: "9788932030982",
    status: "completed",
    start: "2026-02-25",
    done: "2026-03-15",
    rating: 5,
    review: "조르바처럼 살 자신은 없지만, 조르바를 응원하게 된다.",
    memo: "화자가 책만 읽는 사람이라 찔렸다. 몸으로 사는 사람과 머리로 사는 사람.\n춤추는 장면은 소리 내서 읽어 보기.",
    quote: {
      page: 504,
      text: "저는 해냈고 춤도 췄습니다. 더 이상 제게 필요한 것은 없습니다!",
    },
  },
  {
    isbn: "9791187142379",
    status: "completed",
    start: "2026-03-16",
    done: "2026-04-02",
    rating: 4,
    review: "출근길에 한 장씩. 2천 년 전 사람도 똑같이 지쳐 있었다는 게 위로가 됐다.",
  },
  {
    isbn: "9788954672214",
    status: "completed",
    start: "2026-04-10",
    done: "2026-04-27",
    rating: 5,
    review: "가족 이야기를 이렇게 경쾌하게 쓸 수 있다니. 하와이에 가고 싶어졌다.",
    quote: { page: 100, text: "리브 어 리틀. 난 좀 살아볼 거야." },
  },
  {
    isbn: "9791196394509",
    status: "completed",
    start: "2026-05-04",
    done: "2026-05-18",
    rating: 3,
    review: "공감 가는 문장이 많았지만 상담 대화 형식은 조금 길게 느껴졌다.",
  },
  {
    isbn: "9788937417566",
    status: "completed",
    start: "2026-05-25",
    done: "2026-06-09",
    rating: 4,
    review: "AI 화자의 눈으로 보니 오히려 사람이 더 잘 보였다.",
    memo: "클라라가 해를 믿는 방식 = 내가 무언가를 믿는 방식과 다르지 않다.\n이시구로 『남아 있는 나날』도 읽어 보기.",
    quote: {
      page: 12,
      text: "우리가 어디에 있든 해는 우리한테 올 수 있다고 했다.",
    },
  },
  {
    isbn: "9791191731415",
    status: "completed",
    start: "2026-06-15",
    done: "2026-06-30",
    rating: 3,
    review: "핵심은 앞의 세 장에 다 있다. 그래도 고정 마인드셋이라는 말은 오래 남는다.",
  },
  {
    isbn: "9791190090261",
    status: "completed",
    start: "2026-07-06",
    done: "2026-07-22",
    rating: 4,
    review: "경주마와 로봇 기수, 결국은 속도를 늦추는 법에 관한 이야기.",
    quote: {
      page: 179,
      text: "“삼차원의 우리가 일차원의 말에 상처받지 말자.”",
    },
  },
  {
    isbn: "9788925588650",
    status: "completed",
    start: "2026-08-08",
    done: "2026-08-16",
    rating: 5,
    review: "과학으로 버티는 유머. 주말 이틀을 통째로 썼다.",
  },
  {
    isbn: "9791198886101",
    status: "completed",
    start: "2026-08-25",
    done: "2026-09-07",
    rating: 4,
    review: "다정하지만 단호한 문장들. 밑줄이 제일 많은 책.",
    quote: {
      page: 122,
      text: "제한된 인생의 시간 속에서 내가 정말로 좋아하는 사람들을 좋아하는 데에 시간과 마음을 더 쓸 수 있었으면 좋겠다.",
    },
  },
  {
    isbn: "9788936434540",
    status: "completed",
    start: "2026-09-20",
    done: "2026-10-11",
    rating: 4,
    review: "50명이 한 병원 근처를 스쳐 가는 구성이 영화 같았다.",
    quote: { page: 325, text: "하품이 옮는 것처럼 강인함도 옮는다." },
  },
  {
    isbn: "9788937461309",
    status: "reading",
    start: "2026-10-25",
  },
  {
    isbn: "9791176613743",
    status: "reading",
    start: "2026-11-02",
    memo: "자유 = 내가 어떤 원인으로 움직이는지 아는 것. 4장까지 읽음.",
    quote: {
      page: 123,
      text: "자유도 마찬가지입니다. 완전한 자유는 있을 수 없습니다. 그러나 지금보다 자유로워질 수는 있습니다. 자유의 정도를 조금씩 더 높여 갈 수 있습니다.",
    },
  },
  { isbn: "9791168127012", status: "reading", start: "2026-11-15" },
  { isbn: "9788949139999", status: "want_to_read" },
  { isbn: "9791168344358", status: "want_to_read" },
];

// AI 취향 분석 결과 — 미리 저장해 둔다(체험 계정은 "다시 분석"이 막혀 OpenAI 비용이 들지 않는다)
const TASTE = {
  personality_type: "이야기에 사는 사람",
  personality_description:
    "소설 속 인물의 시선으로 세상을 다시 보는 데서 즐거움을 찾는 독자예요. 『우리가 빛의 속도로 갈 수 없다면』, 『시선으로부터,』처럼 사람 사이의 거리와 그리움을 다루는 이야기에 높은 점수를 줬고, SF·고전·한국 소설을 가리지 않고 \"결국 사람에 관한 이야기\"를 골라 읽어요. 자기계발서도 읽지만 별점은 짧고 담백한 편이라, 정보보다 장면과 인물이 오래 남는 책을 더 좋아하는 것으로 보여요. 최근에는 『명상록』, 『처음 만나는 스피노자』로 생각의 근육을 키우는 쪽으로 넓혀 가고 있어요.",
  liked: {
    topics: ["사람 사이의 거리와 그리움", "가족과 관계", "삶을 긍정하는 태도"],
    styles: ["다정한 문장", "여러 인물이 엮이는 구성", "유머가 있는 서술"],
    structures: ["단편집·연작", "300쪽 안팎", "장면 중심 전개"],
  },
  disliked: {
    topics: ["정답을 정해 주는 성공담"],
    styles: ["반복이 많은 설명체"],
    structures: ["앞부분에 핵심이 몰린 구성"],
  },
  patterns: {
    page_count_preference: "250-400",
    author_type: "한국 소설가와 SF 작가",
    publication_period: "2015년 이후",
  },
  evidence: [
    {
      isbn: "9791190090018",
      reason: "멀어진 사람을 끝내 기다리는 마음에 5점과 인생책 표시를 줬어요.",
      topics: ["사람 사이의 거리와 그리움"],
    },
    {
      isbn: "9788954672214",
      reason: "가족의 기억을 경쾌하게 풀어낸 방식에 높은 점수를 줬어요.",
      topics: ["가족과 관계", "삶을 긍정하는 태도"],
    },
    {
      isbn: "9788932030982",
      reason: "몸으로 사는 인물을 응원하는 한줄평에서 삶을 긍정하는 결이 보여요.",
      topics: ["삶을 긍정하는 태도"],
    },
  ],
  recommendations: [
    {
      type: "match",
      isbn: "9791141603762",
      title: "태풍의 이름을 잊은 것처럼",
      author: "정세랑",
      reason: "『시선으로부터,』와 『피프티 피플』을 좋게 읽었다면 같은 작가의 다정한 시선을 이어서 만날 수 있어요.",
    },
    {
      type: "expand",
      isbn: "9791170614029",
      title: "연금술사",
      author: "파울로 코엘료",
      reason: "삶을 긍정하는 이야기를 좋아하는 취향을 우화 형식으로 넓혀 볼 수 있어요.",
    },
    {
      type: "challenge",
      isbn: "9791199849327",
      title: "주의를 기울이는 법",
      author: "롭 워커",
      reason: "소설 밖의 책은 짧게 평가하는 편이지만, 장면처럼 읽히는 에세이형 논픽션이라 도전해 볼 만해요.",
    },
  ],
};

// ─── 실행 ──────────────────────────────────────────────────────────────

const fail = (step, error) => {
  console.error(`✗ ${step}: ${error?.message ?? error}`);
  process.exit(1);
};

/** 1) 계정 — 있으면 찾고, 없으면 만든다. demo 표시는 매번 다시 붙인다 */
const ensureUser = async () => {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) fail("사용자 목록 조회", error);
    const found = data.users.find(
      (user) => user.email?.toLowerCase() === DEMO_EMAIL,
    );
    if (found) {
      const { error: updateError } =
        await supabase.auth.admin.updateUserById(found.id, {
          app_metadata: { ...found.app_metadata, demo: true },
        });
      if (updateError) fail("체험 표시 붙이기", updateError);
      return found.id;
    }
    if (data.users.length < 200) break;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    email_confirm: true,
    app_metadata: { demo: true },
    user_metadata: { full_name: "체험 독자" },
  });
  if (error) fail("체험 계정 만들기", error);
  return data.user.id;
};

const userId = await ensureUser();
console.log(`✓ 체험 계정 ${DEMO_EMAIL} (${userId})`);

/** 2) 프로필 */
{
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    email: DEMO_EMAIL,
    username: DEMO_USERNAME,
    nickname: "체험 독자",
    bio: "page0127 체험 계정이에요. 둘러보기만 되고 저장은 되지 않아요.",
    reading_goal: { year: 2026, target: 24 },
    onboarded_at: "2025-11-01T00:00:00Z",
    is_demo: true,
    updated_at: new Date().toISOString(),
  });
  if (error) fail("프로필 저장", error);
  console.log(`✓ 프로필 @${DEMO_USERNAME}`);
}

/** 3) 카탈로그에서 책 정보 가져오기 — 승인된 책만 */
const isbns = [
  ...BOOKS.map((book) => book.isbn),
  ...TASTE.recommendations.map((rec) => rec.isbn),
];
const { data: catalogRows, error: catalogError } = await supabase
  .from("global_books")
  .select(
    "isbn, title, author, publisher, cover_image, category, spine_image, thickness_mm, review_status",
  )
  .in("isbn", isbns);
if (catalogError) fail("카탈로그 조회", catalogError);
const catalog = new Map(
  (catalogRows ?? [])
    .filter((row) => row.review_status === "approved")
    .map((row) => [row.isbn, row]),
);

let books = BOOKS.filter((book) => {
  if (catalog.has(book.isbn)) return true;
  console.warn(`  · 건너뜀: ${book.isbn} 은 승인된 카탈로그에 없어요`);
  return false;
});

/**
 * 카탈로그가 얇은 DB(dev·스테이징)용 대체 — 12권도 안 되면 그 DB 에 있는 승인된 책(표지 있는 것)으로
 * 빈자리를 채운다. 상태·날짜·별점은 원래 자리 것을 쓰고, 그 책에 맞춰 쓴 한줄평·메모·문장은 뺀다.
 * 운영처럼 목록의 책이 다 있으면 이 단계는 돌지 않는다(취향 분석 글이 실제 책과 맞도록).
 */
if (books.length < 12) {
  const { data: extraRows, error: extraError } = await supabase
    .from("global_books")
    .select(
      "isbn, title, author, publisher, cover_image, category, spine_image, thickness_mm, review_status",
    )
    .eq("review_status", "approved")
    .not("cover_image", "is", null)
    .not("isbn", "in", `(${isbns.join(",")})`)
    .limit(BOOKS.length);
  if (extraError) fail("대체 책 조회", extraError);
  const extras = [...(extraRows ?? [])];
  books = BOOKS.flatMap((book) => {
    if (catalog.has(book.isbn)) return [book];
    const sub = extras.shift();
    if (!sub) return [];
    catalog.set(sub.isbn, sub);
    console.warn(`  · 대체: ${book.isbn} → ${sub.isbn} 『${sub.title}』`);
    return [
      {
        isbn: sub.isbn,
        status: book.status,
        start: book.start,
        done: book.done,
        rating: book.rating,
        lifeBook: book.lifeBook,
        readCount: book.readCount,
      },
    ];
  });
}
if (books.length < 12) {
  fail(
    "책 고르기",
    `카탈로그에서 찾은 책이 ${books.length}권뿐이에요(최소 12권). 목록을 바꿔 주세요.`,
  );
}

/** 4) 지우고 다시 넣기 — FK(ON DELETE CASCADE)로 메모·좋아요도 같이 지워진다 */
for (const table of ["taste_analyses", "book_quotes", "books"]) {
  const { error } = await supabase.from(table).delete().eq("user_id", userId);
  if (error) fail(`${table} 비우기`, error);
}

const bookRows = books.map((book) => {
  const g = catalog.get(book.isbn);
  return {
    user_id: userId,
    isbn: book.isbn,
    // 서지 정보는 트리거가 카탈로그 값으로 다시 덮는다. not null 이라 함께 보낸다.
    title: g.title,
    author: g.author,
    publisher: g.publisher,
    cover_image: g.cover_image,
    category: g.category,
    spine_image: g.spine_image,
    thickness_mm: g.thickness_mm,
    status: book.status,
    start_date: book.start ?? null,
    completed_date: book.done ?? null,
    rating: book.rating ?? null,
    is_life_book: book.lifeBook ?? false,
    one_line_review: book.review ?? null,
    read_count: book.readCount ?? 1,
    is_public: true,
    // 서재는 최근에 담은 순으로 보이므로 실제 읽은 순서대로 시각을 준다
    created_at: `${book.start ?? "2026-11-18"}T09:00:00Z`,
    updated_at: `${book.done ?? book.start ?? "2026-11-18"}T21:00:00Z`,
  };
});

const { data: inserted, error: insertError } = await supabase
  .from("books")
  .insert(bookRows)
  .select("id, isbn, title, cover_image");
if (insertError) fail("책 넣기", insertError);
const bookByIsbn = new Map(inserted.map((row) => [row.isbn, row]));
console.log(`✓ 책 ${inserted.length}권`);

const memoRows = books
  .filter((book) => book.memo)
  .map((book) => ({
    book_id: bookByIsbn.get(book.isbn).id,
    user_id: userId,
    memo: book.memo,
  }));
if (memoRows.length) {
  const { error } = await supabase.from("book_memos").insert(memoRows);
  if (error) fail("메모 넣기", error);
}

const quoteRows = books
  .filter((book) => book.quote)
  .map((book) => ({
    user_id: userId,
    isbn: book.isbn,
    text: book.quote.text,
    page: book.quote.page,
    created_at: `${book.done ?? book.start}T22:00:00Z`,
  }));
if (quoteRows.length) {
  const { error } = await supabase.from("book_quotes").insert(quoteRows);
  if (error) fail("문장 넣기", error);
}
console.log(`✓ 메모 ${memoRows.length}개 · 문장 ${quoteRows.length}개`);

/** 5) 취향 분석 */
{
  const ratedCompleted = books.filter(
    (book) => book.status === "completed" && book.rating != null,
  );
  const evidence = TASTE.evidence
    .filter((item) => bookByIsbn.has(item.isbn))
    .map((item) => {
      const book = bookByIsbn.get(item.isbn);
      return {
        book_id: book.id,
        title: book.title,
        cover_image: book.cover_image,
        reason: item.reason,
        topics: item.topics,
      };
    });

  const { data: analysis, error } = await supabase
    .from("taste_analyses")
    .insert({
      user_id: userId,
      personality_type: TASTE.personality_type,
      personality_description: TASTE.personality_description,
      preference_profile: {
        liked: TASTE.liked,
        disliked: TASTE.disliked,
        patterns: TASTE.patterns,
        evidence,
        selection: {
          version: "recent40-lasting10",
          recent_count: ratedCompleted.length,
          lasting_count: 0,
        },
      },
      analyzed_books_count: ratedCompleted.length,
      // 실제 모델 호출이 아니라 손으로 쓴 결과라는 걸 남긴다(어드민 비용 집계에도 0)
      analysis_model: "demo-seed",
      cost_in_cents: 0,
      created_at: "2026-11-16T12:00:00Z",
    })
    .select("id")
    .single();
  if (error) fail("취향 분석 넣기", error);

  const { error: recError } = await supabase
    .from("book_recommendations")
    .insert(
      TASTE.recommendations.map((rec, index) => {
        const g = catalog.get(rec.isbn);
        return {
          taste_analysis_id: analysis.id,
          recommendation_type: rec.type,
          isbn: g ? rec.isbn : null,
          title: rec.title,
          author: rec.author,
          cover_image: g?.cover_image ?? null,
          category: g?.category ?? null,
          reason: rec.reason,
          display_order: index + 1,
        };
      }),
    );
  if (recError) fail("추천 도서 넣기", recError);
  console.log(`✓ 취향 분석 (${TASTE.personality_type}, 근거 ${evidence.length}권)`);
}

/**
 * 6) 제작자 팔로우 — 라운지 "새로운 기록"이 비지 않도록 체험 계정이 제작자를 팔로우한다.
 *    체험 계정이 한 팔로우는 남에게 안 보이고 팔로워 수에도 안 잡힌다(20261121000200).
 *    service_role 로 넣으므로 팔로우 알림은 가지 않는다(알림은 /api/follows 가 만든다).
 *    DEMO_FOLLOW_USERNAMES=a,b 로 바꿀 수 있다. 없는 아이디는 건너뛴다.
 */
{
  const usernames = (env.DEMO_FOLLOW_USERNAMES ?? "stronger_khj")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const { error: clearError } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", userId);
  if (clearError) fail("팔로우 비우기", clearError);

  const { data: targets, error: targetError } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", usernames);
  if (targetError) fail("팔로우 대상 조회", targetError);
  for (const name of usernames) {
    if (!targets?.some((t) => t.username === name)) {
      console.warn(`  · 건너뜀: @${name} 계정이 없어요`);
    }
  }
  if (targets?.length) {
    const { error } = await supabase.from("follows").insert(
      targets.map((t) => ({ follower_id: userId, following_id: t.id })),
    );
    if (error) fail("팔로우 넣기", error);
  }
  console.log(
    `✓ 팔로우 ${targets?.length ?? 0}명 (${(targets ?? []).map((t) => "@" + t.username).join(", ")})`,
  );
}

console.log("\n끝났어요. /demo 로 들어가 「체험 계정으로 둘러보기」로 확인해 보세요.");
