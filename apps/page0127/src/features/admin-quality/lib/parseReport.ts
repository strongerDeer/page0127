/**
 * 주간 품질 리포트(마크다운) → 화면 구역별 조각.
 *
 * 리포트는 packages/quality/src/report.ts 프롬프트가 정한 틀로 생성된다:
 *   **핵심:** 한 문장
 *   **주요 발견** + 불릿
 *   **다음 주 우선순위** + 번호 목록
 * 한 덩어리 글로 보여 주면 결론(할 일)이 맨 끝에 묻힌다. 조각으로 나눠 결론을 위로 올린다.
 *
 * 생성형 글이라 틀을 벗어날 수 있다 — 핵심이나 할 일을 못 찾으면 null 을 돌려
 * 호출부가 원문 그대로 보여 주게 한다(어긋난 조각을 보여 주느니 원문이 낫다).
 */

export type ReportAction = {
  /** '프로필 페이지 JS 줄이기' — 콜론 앞. 콜론이 없으면 전체가 제목 */
  title: string;
  /** 콜론 뒤 설명. 없으면 빈 문자열 */
  body: string;
};

export type ParsedReport = {
  headline: string;
  findings: string[];
  actions: ReportAction[];
};

type Section = 'none' | 'findings' | 'actions';

/** '**주요 발견**' · '**주요 발견:**' · '주요 발견' 모두 같은 머리글로 본다 */
const isHeading = (line: string, name: string): boolean =>
  line.replace(/\*\*/g, '').replace(/:$/, '').trim() === name;

const splitAction = (text: string): ReportAction => {
  // 첫 콜론에서만 자른다 — 설명 안의 '약 0.75초: ...' 같은 콜론은 건드리지 않는다
  const m = text.match(/^(.{2,40}?)[:：]\s*(.+)$/);
  return m
    ? { title: m[1].replace(/\*\*/g, '').trim(), body: m[2].trim() }
    : { title: text.replace(/\*\*/g, '').trim(), body: '' };
};

export const parseQualityReport = (md: string): ParsedReport | null => {
  let headline = '';
  const findings: string[] = [];
  const actions: ReportAction[] = [];
  let section: Section = 'none';

  for (const raw of md.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const head = line.match(/^\*\*핵심[:：]?\*\*[:：]?\s*(.+)$/);
    if (head) {
      headline = head[1].trim();
      section = 'none';
      continue;
    }
    if (isHeading(line, '주요 발견')) {
      section = 'findings';
      continue;
    }
    if (isHeading(line, '다음 주 우선순위')) {
      section = 'actions';
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    const item = numbered ?? bullet;
    if (section === 'findings' && bullet) findings.push(bullet[1].trim());
    else if (section === 'actions' && item)
      actions.push(splitAction(item[1].trim()));
  }

  if (!headline || actions.length === 0) return null;
  return { headline, findings, actions };
};
