# 표지 전용 Noto 서브셋

- `cover-sans.woff2`: Noto Sans KR, weight 900, 8,296 bytes
- `cover-serif.woff2`: Noto Serif KR, weight 700, 16,932 bytes
- `NotoSansKR-OFL.txt`, `NotoSerifKR-OFL.txt`: 원본 SIL Open Font License
- `print-grain.svg`: 직접 작성한 타일형 인쇄 질감

원본: https://fonts.google.com/specimen/Noto+Sans+KR / https://fonts.google.com/specimen/Noto+Serif+KR

Google Fonts CSS2 API의 `text` 옵션으로 배지 제목의 글자와 숫자를 포함해 내려받은 서브셋이다. 파일은 외부 CDN을 참조하지 않고 앱이 직접 제공한다. 표지 제목을 추가하거나 바꾸면 해당 글자가 있는지 확인하고 필요 시 서브셋을 다시 생성한다. 생성 시 브라우저 User-Agent로 CSS2 API를 요청하고 반환된 URL의 바이너리가 `wOF2` 헤더인지 확인한다.

초기 요청 문자:

```text
책장넓은시야단숨에벽돌완독작가덕질마침내다시펼친인생발견한줄평론약속지킴취향0127의날새해첫하루두권솔직독자얇지만깊신간관세번째만남아쓰이않은기미편집기록1234567890·page
```
