#!/usr/bin/env node
/**
 * 피드 실험용 더미 활동 만들기 (로컬 Supabase 전용)
 *
 * 사용법:
 *   node scripts/lab/seed-large-library.mjs 10000        # 먼저 책이 있어야 한다
 *   node scripts/lab/seed-feed.mjs 1000                  # lab_reader 의 활동 1천 개
 *
 * 피드는 "책마다 최신 활동 1건"을 보여 준다(book_latest_activities 뷰). 그래서 책 N권에
 * 활동을 하나씩 만든다. 감상 길이를 들쭉날쭉하게 넣어 카드 높이가 제각각이 되게 한다 —
 * 실제 피드처럼 높이를 미리 모르는 목록이어야 가상화 실험이 의미가 있다.
 */
import { execSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

const count = Number(process.argv[2] ?? 1000);
const LAB_USERNAME = "lab_reader";

const raw = execSync("supabase status -o json", {
  stdio: ["ignore", "pipe", "ignore"],
}).toString();
const status = JSON.parse(raw.slice(raw.indexOf("{")));
if (!["127.0.0.1", "localhost"].includes(new URL(status.API_URL).hostname)) {
  console.error("안전 검사 실패: 로컬 Supabase 가 아니에요. 멈춥니다.");
  process.exit(1);
}
const supabase = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: profile } = await supabase
  .from("profiles")
  .select("id")
  .eq("username", LAB_USERNAME)
  .single();
if (!profile) {
  console.error("lab_reader 가 없어요. seed-large-library.mjs 를 먼저 돌리세요.");
  process.exit(1);
}

const { data: books, error } = await supabase
  .from("books")
  .select("id")
  .eq("user_id", profile.id)
  .eq("is_public", true)
  .order("id")
  .limit(count);
if (error) throw error;

await supabase.from("activities").delete().eq("user_id", profile.id);

const SENTENCE = "오래 붙잡고 읽은 문장이 많았다. ";
const now = Date.now();
const rows = books.map((book, i) => {
  const kind = i % 3;
  return {
    user_id: profile.id,
    book_id: book.id,
    activity_type: kind === 0 ? "review_added" : kind === 1 ? "book_completed" : "book_added",
    // 감상은 0~6문장 — 카드 높이가 제각각
    content: kind === 0 ? SENTENCE.repeat((i % 7)).trim() || null : null,
    created_at: new Date(now - i * 60_000).toISOString(),
  };
});

for (let from = 0; from < rows.length; from += 500) {
  const { error: insertError } = await supabase
    .from("activities")
    .insert(rows.slice(from, from + 500));
  if (insertError) throw insertError;
}
console.log(`완료: ${LAB_USERNAME} 활동 ${rows.length}개`);
