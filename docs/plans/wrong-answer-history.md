# 자격증별·일자별 오답 이력 Implementation Plan

**Goal:** 모의고사/과목별 연습에서 틀린 문제를 자격증 → 응시한 날짜(오늘 날짜, 회차 시행일 아님) 단위로 localStorage에 누적 기록하고, `/history`에서 확인할 수 있게 한다.

**참고 문서:** `docs/prd/wrong-answer-history.md` (APPROVED)

---

## File Structure (변경분만)

```
lib/
  types.ts            # WrongAnswerEntry 타입 추가
  examHistory.ts       # 신규 — localStorage 저장/조회 (lib/examStorage.ts와 동일 패턴, zod 검증)
  examHistory.test.ts   # 신규 — dedup 등 순수 로직 단위테스트
app/
  page.tsx              # 홈 화면에 "오답 이력" 진입점 링크 추가
  history/
    page.tsx              # 신규 — 자격증 → 날짜별 오답 목록 + 문항 상세 열람
  [cert]/[round]/exam/page.tsx    # finishExam에서 오답 기록 호출 추가
components/
  QuestionList.tsx        # handleSelect에서 오답이면 기록 호출 추가
```

---

## 데이터 모델

```ts
// lib/types.ts에 추가
export interface WrongAnswerEntry {
  cert: string
  round: string          // 회차 시행일 (YYYY-MM-DD) — 문항 데이터 조회용
  mode: 'exam' | 'practice'
  questionNumber: number
  chosenAnswer: 1 | 2 | 3 | 4
  attemptDate: string      // 실제 푼 날짜 (YYYY-MM-DD), new Date()에서 파생
}
```

localStorage 키 `exam-wrong-history`에 `WrongAnswerEntry[]` 전체를 저장한다(기존 `examStorage.ts`가 시도별로 개별 키를 쓰는 것과 다르게, 이력은 계속 누적되는 하나의 로그라 배열 하나가 더 자연스럽다 — 항목 수가 자격증당 최대 수백 건 수준이라 단일 배열 read/write 비용은 무시 가능).

**Dedup 키**: `cert:round:mode:questionNumber:attemptDate`. 이미 존재하면 `chosenAnswer`만 최신 값으로 덮어쓰고 새 항목을 추가하지 않는다(같은 날 여러 번 틀려도 1건 — PRD 결정 3).

## `lib/examHistory.ts`

```ts
export function recordWrongAnswer(entry: WrongAnswerEntry): void
export function getWrongHistory(): WrongAnswerEntry[]
```

- `recordWrongAnswer`: localStorage에서 기존 배열을 읽고(zod 검증, 실패 시 빈 배열로 시작 — `examStorage.ts`와 동일한 "손상된 데이터는 조용히 무시" 원칙), dedup 키로 기존 항목을 찾아 있으면 교체·없으면 추가 후 저장.
- `getWrongHistory`: 검증 통과한 배열 반환, 실패 시 `[]`.
- 오늘 날짜는 호출부(컴포넌트)에서 `new Date().toISOString().slice(0, 10)`로 구해 넘긴다 — 모듈 자체는 순수하게 유지해 테스트하기 쉽게 한다.

## 기록 트리거

1. **모의고사** (`app/[cert]/[round]/exam/page.tsx`): `finishExam`이 `gradeAttempt` 호출 직후, `graded.wrongQuestionNumbers`를 순회하며 각 문항에 대해 `recordWrongAnswer({ cert, round, mode: 'exam', questionNumber, chosenAnswer: answers[questionNumber], attemptDate: today })` 호출. `answers[questionNumber]`가 없는 경우(미응답 문항)는 기록하지 않는다 — "틀렸다"가 아니라 "안 풀었다"이므로 오답 이력과 다른 사안.
2. **과목별 연습** (`components/QuestionList.tsx`): `handleSelect`에서 `choice !== question.answer`면 `recordWrongAnswer` 호출. 나중에 같은 문항을 다시 눌러 정답을 골라도(같은 날) dedup 키가 같으므로 항목이 갱신될 뿐 사라지지 않는다 — PRD 결정 3 그대로.

## `/history` 화면

클라이언트 컴포넌트(localStorage는 서버에서 못 읽음). 마운트 시 `getWrongHistory()`로 전체 이력을 읽어:

1. `cert`로 그룹 → 각 그룹 내 `attemptDate` 내림차순(최근 날짜 먼저) 그룹 → 각 날짜 그룹 내 항목 리스트.
2. 각 항목은 `{round} 회차 · {questionNumber}번` 텍스트로 표시. 클릭하면 그 항목의 `cert/round`로 `/api/questions`를 호출해(이미 exam 페이지가 쓰는 것과 동일한 라우트) 문항을 찾아 지문/보기를 펼쳐 보여준다 — 선택한 오답은 빨간 테두리, 정답은 초록 테두리로 표시(`QuestionList.tsx`의 기존 정오답 표시 패턴 재사용).
3. 이력이 하나도 없으면 빈 상태 안내 문구.
4. 화면 상단에 "이 기록은 이 브라우저에만 저장되며, 브라우저 데이터를 지우면 함께 사라집니다" 한 줄 안내 (PRD 결정 5).

## 홈 화면 진입점

`app/page.tsx`의 자격증 목록 위/아래에 `/history`로 가는 링크 한 줄 추가.

## 테스트

`lib/examHistory.test.ts`:
- 첫 기록 시 배열에 추가된다.
- 같은 dedup 키로 다시 기록하면 항목 수는 그대로이고 `chosenAnswer`만 갱신된다.
- 다른 `attemptDate`(다른 날)로 같은 문항을 기록하면 별도 항목으로 추가된다(하루 단위 이력이 목적이므로).
- 손상된 localStorage 값(`examStorage.test.ts`가 있다면 그 패턴 참고, 없으면 JSON.parse 실패/스키마 불일치 케이스)에서 `getWrongHistory()`가 크래시 대신 `[]`를 반환한다.

기존 `npx vitest run` 스위트에 자연 편입 — 별도 실행 설정 불필요.

## 롤백 전략

전부 신규 파일 + 기존 두 곳(finishExam, handleSelect)에 부가 호출 추가일 뿐, 기존 채점/저장 로직을 변경하지 않는다. 문제가 생기면 두 호출부만 되돌리면 기존 동작에 영향 없음.
