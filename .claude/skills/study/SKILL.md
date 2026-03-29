---
name: study
description: React 스터디 일차 진행. 스케줄에서 다음 미완료 일차를 찾아 MD를 작성하고 스케줄을 업데이트한다. 사용자가 "N일차 진행", "study", "/study" 등을 입력할 때 사용.
argument-hint: [day-number]
---

## 지시사항

아래 순서대로 **최소한의 파일만 읽어** 진행한다. 불필요한 파일은 열지 않는다.

### Step 1 — 일차 결정

`$ARGUMENTS`가 있으면 그 숫자를 사용한다.
없으면 `00_react_study/00_STUDY_SCHEDULE.md`에서 ✅ 없는 첫 번째 Day를 찾는다.
→ **스케줄 파일 전체를 읽지 말고 grep으로 찾는다.**

```
grep -n "✅" 00_react_study/00_STUDY_SCHEDULE.md | tail -1
```

마지막 ✅ 다음 줄이 오늘 할 Day다.

### Step 2 — 스케줄에서 해당 Day 1줄만 확인

스케줄 파일에서 해당 Day 행만 읽어 **주제**와 **page0127 연결 포인트**를 파악한다.

### Step 3 — 필요한 파일만 읽기

연결 포인트에 명시된 파일만 읽는다. 보통 1~3개.
이미 이전 대화에서 읽은 파일은 다시 읽지 않는다.

### Step 4 — MD 작성

파일 경로: `00_react_study/phase2_dayNN_주제.md`

MD 구성 (간결하게):
1. 오늘 읽을 코드 (파일 링크)
2. 핵심 개념 (짧게, 코드 예시 포함)
3. page0127 실제 코드 사례 (읽은 파일 기준)
4. 정리 표 또는 규칙 1줄
5. 오늘 실험 (2가지)
6. 다음 Day 예고

### Step 5 — 스케줄 업데이트

해당 Day 날짜 옆에 ✅ 추가. 날짜는 `오늘 날짜(CLAUDE.md의 currentDate)`로.

### Step 6 — 커밋 메시지 제공

```bash
git add 00_react_study/phase2_dayNN_주제.md 00_react_study/00_STUDY_SCHEDULE.md
git commit -m "$(cat <<'EOF'
✏️ Study: Day NN — 주제

한 줄 요약

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## 토큰 절약 규칙

- 스케줄 전체 읽기 금지 → grep 사용
- 이미 읽은 파일 재독 금지
- 개념 설명은 핵심만, 장황하게 쓰지 않는다
- MD는 250줄 이내로 작성
- 코드 예시는 실제 page0127 코드 우선, 설명용 예시는 최소화
