import { parseCssVars, resolveVar } from '@repo/design-tokens/css-vars';
import lightCss from '@repo/design-tokens/tokens.css?raw';
import darkCss from '@repo/design-tokens/tokens-dark.css?raw';

/**
 * Foundation 스토리가 쓰는 토큰 목록.
 *
 * 값을 손으로 옮겨 적지 않고 생성물(dist/*.css)을 그 자리에서 파싱한다.
 * 문서가 토큰보다 낡는 일을 구조적으로 막기 위해서다 — 토큰을 고치고
 * 빌드하면 이 페이지도 같이 바뀐다.
 */

export type Token = {
  /** CSS 변수명 (`--navy-600`) */
  name: string;
  /** 선언된 그대로. 별칭이면 `var(--navy-600)` */
  raw: string;
  /** var() 를 끝까지 따라간 최종 값 */
  value: string;
  /** 토큰 JSON 의 $description — 왜 이 값인지 */
  description?: string;
  /** 다른 토큰을 참조하는가 */
  isAlias: boolean;
};

/**
 * 값 뒤에 붙은 `/** … *\/` 주석을 변수명에 대응시킨다.
 * parseCssVars 는 값만 뽑고 주석을 버리므로 여기서 따로 훑는다.
 */
const parseDescriptions = (css: string): Record<string, string> => {
  const out: Record<string, string> = {};
  const re = /--([a-zA-Z0-9-]+)\s*:\s*[^;]+;\s*\/\*\*([\s\S]*?)\*\//g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    out[`--${m[1]}`] = m[2].trim();
  }
  return out;
};

const lightVars = parseCssVars(lightCss);
const darkVars = parseCssVars(darkCss);
const lightDescriptions = parseDescriptions(lightCss);
const darkDescriptions = parseDescriptions(darkCss);

/**
 * 다크는 라이트를 덮어쓰는 관계다 — 다크에 없는 이름은 라이트 값을 그대로 쓴다.
 * 그래서 다크 토큰의 최종 값을 구하려면 두 맵을 겹친 것으로 참조를 따라가야 한다.
 * (다크의 `--text-subtle: var(--navy-300)` 은 navy/300 이 라이트에만 있다)
 */
const mergedForDark = { ...lightVars, ...darkVars };

const toToken = (
  name: string,
  vars: Record<string, string>,
  scope: Record<string, string>,
  descriptions: Record<string, string>
): Token => {
  const raw = vars[name];
  return {
    name,
    raw,
    value: resolveVar(scope, name),
    description: descriptions[name],
    isAlias: raw.startsWith('var('),
  };
};

const NAMED_STEP_RE = /^--[a-z]+-\d+$/;

/**
 * 원색인가. 이름 형태(`--계열-숫자`)만으로는 갈라지지 않는다 —
 * `--chart-1` 도 그 형태지만 `var(--blue-600)` 을 가리키는 직무 토큰이다.
 * 원색의 진짜 조건은 **다른 토큰을 참조하지 않고 값을 직접 들고 있다**는 것이다.
 */
const isPrimitive = (name: string) =>
  NAMED_STEP_RE.test(name) && !lightVars[name].startsWith('var(');

export const primitives: Token[] = Object.keys(lightVars)
  .filter(isPrimitive)
  .map((name) => toToken(name, lightVars, lightVars, lightDescriptions));

/** 원색을 색 계열별로 묶는다 (`--blue-600` → `blue`) */
export const primitiveGroups: { family: string; tokens: Token[] }[] =
  primitives.reduce<{ family: string; tokens: Token[] }[]>((groups, token) => {
    const family = token.name.replace(/^--/, '').replace(/-\d+$/, '');
    const found = groups.find((g) => g.family === family);
    if (found) found.tokens.push(token);
    else groups.push({ family, tokens: [token] });
    return groups;
  }, []);

/** 색 토큰인지 — 폰트 크기·반경 같은 치수 토큰을 스와치에서 걸러낸다 */
const isColor = (value: string) =>
  value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl');

/** 직무 토큰 — 컴포넌트가 실제로 쓰는 것들 */
export const semanticColors: Token[] = Object.keys(lightVars)
  .filter((name) => !isPrimitive(name))
  .map((name) => toToken(name, lightVars, lightVars, lightDescriptions))
  .filter((token) => isColor(token.value));

/** 다크에서 값이 덮어써진 토큰만 */
export const darkOverrides: Token[] = Object.keys(darkVars)
  .map((name) => toToken(name, darkVars, mergedForDark, darkDescriptions))
  .filter((token) => isColor(token.value));

/** 치수 토큰 (반경·폰트 크기) */
export const dimensions: Token[] = Object.keys(lightVars)
  .filter((name) => !isPrimitive(name))
  .map((name) => toToken(name, lightVars, lightVars, lightDescriptions))
  .filter((token) => !isColor(token.value));

/** 다크 최종 값 조회 — 없으면 라이트를 따른다는 뜻이라 null */
export const darkValueOf = (name: string): string | null =>
  name in darkVars ? resolveVar(mergedForDark, name) : null;

/**
 * 이름으로 골라 온다. 팔레트 문서가 토큰을 "전부 나열"하는 대신
 * 의미 단위로 묶어 보여주기 위한 것 — 명암비 수치는 재는 대상이 정해져야 뜻이 생긴다.
 * 없는 이름은 조용히 빠뜨리지 않고 바로 터뜨린다(문서가 낡으면 알아야 한다).
 */
export const pick = (...names: string[]): Token[] =>
  names.map((name) => {
    const token = semanticColors.find((t) => t.name === name);
    if (!token) throw new Error(`없는 토큰: ${name}`);
    return token;
  });
