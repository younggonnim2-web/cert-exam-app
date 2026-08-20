import { z } from 'zod'
import type { WrongAnswerEntry, ExamAttemptSummary } from './types'

// examStorage.ts와 같은 이유: localStorage는 사용자가 devtools로 직접 편집할 수 있는
// 시스템 경계라, 컴파일 타임 캐스트만으로는 부족하다 — zod로 형태까지 검증한다.
const wrongAnswerEntrySchema = z.object({
  cert: z.string(),
  round: z.string(),
  mode: z.enum(['exam', 'practice']),
  questionNumber: z.number(),
  chosenAnswer: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  attemptDate: z.string(),
})
const wrongHistorySchema = z.array(wrongAnswerEntrySchema)
const WRONG_HISTORY_KEY = 'exam-wrong-history'

const examAttemptSummarySchema = z.object({
  cert: z.string(),
  round: z.string(),
  attemptDate: z.string(),
  correctCount: z.number(),
  totalCount: z.number(),
  scorePercent: z.number(),
  passed: z.boolean(),
})
const attemptHistorySchema = z.array(examAttemptSummarySchema)
const ATTEMPT_HISTORY_KEY = 'exam-attempt-history'

// 두 이력(오답 문항 / 응시 점수 요약)이 저장·중복제거 방식은 똑같고 스키마와 dedup
// 키만 다르다 — 그 공통 부분을 여기 한 곳에 모아 각 이력은 자기 스키마/키만 넘긴다.
function loadRecords<T>(storageKey: string, schema: z.ZodType<T[]>): T[] {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = schema.safeParse(parsed)
    // 손상된 JSON이거나 스키마가 어긋난 데이터는 크래시 대신 빈 이력으로 취급한다 —
    // examStorage.ts/parseExam.ts와 동일한 "조용히 실패하지 않되 죽지도 않는다" 원칙.
    return result.success ? result.data : []
  } catch {
    return []
  }
}

function upsertRecord<T>(
  storageKey: string,
  schema: z.ZodType<T[]>,
  dedupKey: (item: T) => string,
  entry: T
): void {
  const records = loadRecords(storageKey, schema)
  const key = dedupKey(entry)
  const hasExisting = records.some((r) => dedupKey(r) === key)
  const next = hasExisting
    ? records.map((r) => (dedupKey(r) === key ? entry : r))
    : [...records, entry]
  localStorage.setItem(storageKey, JSON.stringify(next))
}

function wrongAnswerDedupKey(entry: WrongAnswerEntry): string {
  return `${entry.cert}:${entry.round}:${entry.mode}:${entry.questionNumber}:${entry.attemptDate}`
}

// 같은 문항을 같은 날 여러 번 틀려도 1건으로 기록한다(자격증+회차+모드+문항번호+
// 응시일 기준). 그날 나중에 정답을 골라도 이 함수가 다시 호출되지 않는 한(정답
// 선택은 오답이 아니므로 호출부에서 애초에 부르지 않는다) 이력은 지워지지 않는다 —
// "그날 틀렸었다"는 기록이 목적이지, 현재 시점 오답 목록이 아니다.
export function recordWrongAnswer(entry: WrongAnswerEntry): void {
  upsertRecord(WRONG_HISTORY_KEY, wrongHistorySchema, wrongAnswerDedupKey, entry)
}

export function getWrongHistory(): WrongAnswerEntry[] {
  return loadRecords(WRONG_HISTORY_KEY, wrongHistorySchema)
}

function examAttemptDedupKey(entry: ExamAttemptSummary): string {
  return `${entry.cert}:${entry.round}:${entry.attemptDate}`
}

// 오답 이력과 같은 철학: 자격증+회차+응시일 기준으로 하루 1건. 같은 날 다시 봐서
// 재제출하면 그날 기록이 최신 결과로 갱신되고(과거 점수는 남기지 않는다), 다른 날
// 다시 보면 별도 기록으로 쌓인다.
export function recordExamAttempt(entry: ExamAttemptSummary): void {
  upsertRecord(ATTEMPT_HISTORY_KEY, attemptHistorySchema, examAttemptDedupKey, entry)
}

export function getExamAttempts(): ExamAttemptSummary[] {
  return loadRecords(ATTEMPT_HISTORY_KEY, attemptHistorySchema)
}
