# 표지 아트와 단계 숫자 글꼴

- `story-art-v2.png`: 이야기 9종의 완성 표지, 1086×1448, 3열×3행
- `companion-art-v2.png`: 성장 2종·비밀 8종·공통 미획득 표지, 941×1672, 3열×4행. 마지막 셀은 미사용
- `cover-sans.woff2`: 성장 단계 숫자용 Noto Sans KR 900 서브셋, 8,296 bytes
- `NotoSansKR-OFL.txt`: SIL Open Font License

아트는 내장 image_gen으로 제작했다. 글자·그림·질감을 이미지 그대로 보존하며, 실제 앱에서는 Next의
로컬 이미지 최적화가 품질 85로 제공한다. 셀 매핑과 원본 해상도는 `badgeCoverArt.ts`에 기록한다. 단계
숫자와 책등 이름은 UI에서 표시한다. 접근 가능한 이름은 이미지 밖의 실제 텍스트와 버튼 이름으로
제공한다.

생성 프롬프트와 제목별 의미는 `docs/design/badge-books/`에 보관했다.
