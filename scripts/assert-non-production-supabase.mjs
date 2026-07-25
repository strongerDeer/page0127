const targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const productionUrl = process.env.PRODUCTION_SUPABASE_URL;

if (!targetUrl || !productionUrl) {
  console.error(
    "CI 안전 검사에 NEXT_PUBLIC_SUPABASE_URL과 PRODUCTION_SUPABASE_URL이 모두 필요합니다.",
  );
  process.exit(1);
}

let targetOrigin;
let productionOrigin;

try {
  targetOrigin = new URL(targetUrl).origin;
  productionOrigin = new URL(productionUrl).origin;
} catch {
  console.error("Supabase URL 환경변수 형식이 올바르지 않습니다.");
  process.exit(1);
}

if (targetOrigin === productionOrigin) {
  console.error(
    "안전 검사 실패: CI/Preview가 운영 Supabase를 가리키고 있습니다.",
  );
  process.exit(1);
}

console.log("Supabase 환경 분리 검사 통과: 비운영 프로젝트를 사용합니다.");
