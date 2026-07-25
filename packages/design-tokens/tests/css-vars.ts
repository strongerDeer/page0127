/**
 * CSS 텍스트에서 커스텀 프로퍼티(--name: value)를 뽑아낸다.
 *
 * blockSelector 를 주면 그 선택자 블록 안만 훑는다.
 * globals.css 는 @theme inline 블록에도 --color-* 변수가 잔뜩 있어서,
 * :root 만 잘라내야 우리가 원하는 46개가 정확히 잡힌다.
 */
export function parseCssVars(
  css: string,
  opts: { blockSelector?: string } = {},
): Record<string, string> {
  let scope = css;

  if (opts.blockSelector) {
    // 블록 안에 중첩 중괄호가 없다는 전제 (globals.css 의 :root 가 그렇다)
    const blockRe = new RegExp(`${opts.blockSelector}\\s*\\{([\\s\\S]*?)\\n\\}`);
    const found = css.match(blockRe);
    if (!found) throw new Error(`블록을 찾지 못했다: ${opts.blockSelector}`);
    scope = found[1];
  }

  const vars: Record<string, string> = {};
  const varRe = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = varRe.exec(scope)) !== null) {
    vars[`--${m[1]}`] = m[2].trim();
  }
  return vars;
}

/**
 * var(--x) 참조를 끝까지 따라가 최종 값을 구한다.
 * --border: var(--line) → --line: #dfe3e8 → "#dfe3e8"
 */
export function resolveVar(
  vars: Record<string, string>,
  name: string,
  seen: Set<string> = new Set(),
): string {
  if (seen.has(name)) throw new Error(`순환 참조: ${name}`);
  seen.add(name);

  const raw = vars[name];
  if (raw === undefined) throw new Error(`정의되지 않은 변수: ${name}`);

  const ref = raw.match(/^var\(\s*(--[a-zA-Z0-9-]+)\s*\)$/);
  return ref ? resolveVar(vars, ref[1], seen) : raw;
}

/** #FFFFFF 와 #ffffff 가 다르게 잡히지 않도록 표기를 통일한다. */
export function normalize(value: string): string {
  return value.trim().toLowerCase();
}
