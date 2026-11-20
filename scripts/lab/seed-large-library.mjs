#!/usr/bin/env node
/**
 * 대용량 렌더링 실험용 더미 서재 만들기 (로컬 Supabase 전용)
 *
 * 사용법:
 *   supabase start                       # 로컬 DB 띄우기 (Docker)
 *   node scripts/lab/seed-large-library.mjs 10000            # lab_reader 에 1만 권
 *   node scripts/lab/seed-large-library.mjs 150 lab_small    # 보통 크기 서재
 *
 * 하는 일:
 *   1) 실험 계정(lab-reader)을 하나 만든다. 이미 있으면 그 계정의 책을 지우고 다시 채운다.
 *   2) 책 N권을 넣는다. 연도는 최근 10년에 고르게, 상태·별점·두께는 실제 분포와 비슷하게.
 *
 * 왜 로컬 주소만 허용하나:
 *   서비스 롤 키로 책 1만 권을 넣는 스크립트다. 운영이나 dev 를 가리키면 되돌리기 어렵다.
 *   그래서 환경변수가 무엇이든 127.0.0.1 / localhost 가 아니면 아무것도 하지 않고 멈춘다.
 *   (scripts/assert-non-production-supabase.mjs 는 "운영이 아니면 통과"라 여기엔 느슨하다)
 */
import { execSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

// 세 번째 인자로 다른 실험 계정을 만들 수 있다 (예: 보통 크기 서재 lab_small 150권)
const LAB_USERNAME = process.argv[3] ?? "lab_reader";
if (!/^lab_[a-z0-9_]{1,16}$/.test(LAB_USERNAME)) {
  console.error("실험 계정 이름은 lab_ 로 시작해야 해요. 예: lab_small");
  process.exit(1);
}
const LAB_EMAIL = `${LAB_USERNAME.replace(/_/g, "-")}@example.test`;
const BATCH = 500;

const count = Number(process.argv[2] ?? 10000);
if (!Number.isInteger(count) || count < 1 || count > 50000) {
  console.error(
    "권수는 1~50000 사이 정수로 주세요. 예: node seed-large-library.mjs 10000",
  );
  process.exit(1);
}

/** 로컬 Supabase 주소·키는 `supabase status` 에서 직접 읽는다 — .env 를 믿지 않는다 */
const readLocalStatus = () => {
  try {
    const raw = execSync("supabase status -o json", {
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
    return JSON.parse(raw.slice(raw.indexOf("{")));
  } catch {
    console.error(
      "로컬 Supabase 가 떠 있지 않아요. 먼저 `supabase start` 를 실행하세요.",
    );
    process.exit(1);
  }
};

const status = readLocalStatus();
const apiUrl = new URL(status.API_URL);
if (!["127.0.0.1", "localhost"].includes(apiUrl.hostname)) {
  console.error(
    `안전 검사 실패: ${apiUrl.origin} 은 로컬 주소가 아니에요. 멈춥니다.`,
  );
  process.exit(1);
}

const supabase = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── 실제 서재와 비슷한 분포 ─────────────────────────────────────────────
const CATEGORIES = [
  "국내도서>소설/시/희곡>한국소설",
  "국내도서>소설/시/희곡>영미소설",
  "국내도서>인문학>철학",
  "국내도서>경제경영>마케팅",
  "국내도서>사회과학>사회학>사회학 일반",
  "국내도서>에세이>한국에세이",
  "국내도서>자기계발>성공",
  "국내도서>자연과학>물리학",
  "국내도서>역사>세계사",
  "국내도서>컴퓨터/모바일>프로그래밍",
];
const WORDS = [
  "밤",
  "바다",
  "기억",
  "도시",
  "정원",
  "편지",
  "여름",
  "고양이",
  "시간",
  "숲",
  "거울",
  "문장",
  "겨울",
  "창문",
  "길",
];

/** 매번 같은 결과가 나오게 시드 고정 난수 — 측정을 반복해도 같은 서재여야 비교가 된다 */
let seed = 20261120;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (list) => list[Math.floor(rand() * list.length)];

const thisYear = new Date().getFullYear();
const makeBook = (i) => {
  const isbn = `979${String(1100000000 + i).padStart(10, "0")}`;
  const roll = rand();
  // 완독 85% · 읽는 중 3% · 읽고 싶어요 12%
  const status =
    roll < 0.85 ? "completed" : roll < 0.88 ? "reading" : "want_to_read";
  const year = thisYear - Math.floor(rand() * 10);
  const month = 1 + Math.floor(rand() * 12);
  const day = 1 + Math.floor(rand() * 28);
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // 별점: 5점은 표지로 세워지므로 비율이 렌더 비용에 영향을 준다 → 약 10%
  const ratingRoll = rand();
  const rating =
    status !== "completed"
      ? null
      : ratingRoll < 0.1
        ? 5
        : ratingRoll < 0.45
          ? 4
          : ratingRoll < 0.8
            ? 3
            : ratingRoll < 0.92
              ? 2
              : 0;
  return {
    global: {
      isbn,
      title: `${pick(WORDS)}의 ${pick(WORDS)} ${i + 1}`,
      author: `작가${(i % 400) + 1}`,
      publisher: `출판사${(i % 60) + 1}`,
      category: pick(CATEGORIES),
      // 책 소개 — 실제 카탈로그는 수백 자다. 책장 화면은 안 쓰지만 select('*') 면 같이 실려 온다
      description: Array.from(
        { length: 12 },
        () => `${pick(WORDS)}과 ${pick(WORDS)}에 관한 이야기.`,
      ).join(" "),
      // 표지도 비운다 — 외부 이미지 서버 속도가 측정에 섞이지 않게(이미지 없는 표지 칸으로 그려진다).
      // 상대 경로를 넣으면 전체 도서 OG 이미지가 빌드 때 "절대 URL 아님"으로 깨진다
      cover_image: null,
      // 책등 이미지는 비운다 → 글자 책등(두께로 폭 계산). 이미지 책등 폭은 로드해야 알 수 있어
      // 측정이 흔들린다. README 에 한계로 적는다.
      spine_image: null,
      thickness_mm: 10 + Math.floor(rand() * 30),
      source: "aladin",
      review_status: "approved",
    },
    book: {
      isbn,
      status,
      rating,
      start_date: status === "want_to_read" ? null : date,
      completed_date: status === "completed" ? date : null,
      // completed_year 는 날짜 없이 연도만 아는 책 전용(CHECK 제약) → 날짜가 있으니 비운다
      completed_year: null,
      one_line_review: rand() < 0.3 ? `${pick(WORDS)}처럼 오래 남는 책` : null,
      is_public: rand() < 0.9,
      read_count: rand() < 0.05 ? 2 : 1,
      thickness_mm: null, // 아래에서 global 값으로 채움
      created_at: `${date}T09:00:00Z`,
    },
  };
};

// ── 1) 실험 계정 ─────────────────────────────────────────────────────────
const findOrCreateUser = async () => {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((user) => user.email === LAB_EMAIL);
  if (existing) return existing.id;
  const { data, error } = await supabase.auth.admin.createUser({
    email: LAB_EMAIL,
    password: "lab-reader-local-only",
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
};

const userId = await findOrCreateUser();
{
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    email: LAB_EMAIL,
    nickname: "실험 독자",
    username: LAB_USERNAME,
  });
  if (error) throw error;
}

// ── 2) 책 채우기 ─────────────────────────────────────────────────────────
await supabase.from("books").delete().eq("user_id", userId);

const rows = Array.from({ length: count }, (_, i) => makeBook(i));
const started = Date.now();
for (let from = 0; from < rows.length; from += BATCH) {
  const chunk = rows.slice(from, from + BATCH);
  const globals = await supabase.from("global_books").upsert(
    chunk.map((row) => row.global),
    { onConflict: "isbn" },
  );
  if (globals.error) throw globals.error;
  const books = await supabase.from("books").insert(
    chunk.map((row) => ({
      ...row.book,
      user_id: userId,
      title: row.global.title,
      thickness_mm: row.global.thickness_mm,
    })),
  );
  if (books.error) throw books.error;
  process.stdout.write(`\r${Math.min(from + BATCH, count)} / ${count}권`);
}
console.log(
  `\n완료: /${LAB_USERNAME} 에 ${count}권 (${((Date.now() - started) / 1000).toFixed(1)}초)`,
);
