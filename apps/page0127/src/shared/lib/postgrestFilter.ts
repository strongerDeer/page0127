/**
 * `.or()` 같은 PostgREST 필터 **문자열**에 사용자 입력을 넣을 때 값을 감싼다.
 *
 * 왜 필요한가:
 * `.eq('isbn', v)` 는 supabase-js 가 값을 알아서 처리하지만, `.or()` 는 문자열을 그대로
 * 넘긴다. 그래서 `query.or(\`isbn.eq.${isbn},...\`)` 에 `x,user_id.neq.0` 이 들어오면
 * 쉼표가 조건 구분자로 읽혀 **조건이 하나 늘어난다**(필터 주입).
 *
 * PostgREST 규칙: 값을 큰따옴표로 감싸면 `, . : ( )` 가 문자 그대로 취급되고,
 * 그 안의 `"` 와 `\` 는 역슬래시로 이스케이프한다. 형식 검사(정규식)로 막지 않는 이유는
 * `books.isbn` 에 ISBN13·ISBN10·K코드가 섞여 있어 정상 값을 거를 위험이 있기 때문이다.
 */
export const quotePostgrestValue = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
