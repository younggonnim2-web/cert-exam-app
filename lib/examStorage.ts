import { z } from 'zod'
import type { Attempt } from './types'
import type { GradeResult } from './grading'

// 시스템 경계(localStorage, 사용자가 devtools로 직접 편집 가능)에서 읽어들이는 데이터는
// 컴파일 타임 캐스트(`as Attempt`)만으로는 부족하다 — JSON 문법은 유효해도 스키마가
// 어긋난 값이 그대로 UI 상태로 흘러들어갈 수 있다. zod로 형태까지 검증한다.
const attemptSchema = z.object({
  cert: z.string(),
  round: z.string(),
  mode: z.enum(['exam', 'practice']),
  answers: z.record(z.string(), z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])),
  startedAt: z.number(),
  remainingSeconds: z.number().optional(),
})

const gradeResultSchema = z.object({
  correctCount: z.number(),
  totalCount: z.number(),
  scorePercent: z.number(),
  wrongQuestionNumbers: z.array(z.number()),
})

export function attemptKey(cert: string, round: string, mode: Attempt['mode']): string {
  return `exam-attempt:${cert}:${round}:${mode}`
}

export function saveAttempt(attempt: Attempt): void {
  localStorage.setItem(
    attemptKey(attempt.cert, attempt.round, attempt.mode),
    JSON.stringify(attempt)
  )
}

export function loadAttempt(
  cert: string,
  round: string,
  mode: Attempt['mode']
): Attempt | null {
  const raw = localStorage.getItem(attemptKey(cert, round, mode))
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = attemptSchema.safeParse(parsed)
    // 손상된 JSON이거나(사파리 프라이빗 모드 등) 스키마가 어긋난 데이터는 모두 새로
    // 시작한 것으로 취급한다 — 크래시 대신 조용히 무시
    return result.success ? (result.data as Attempt) : null
  } catch {
    return null
  }
}

export function clearAttempt(cert: string, round: string, mode: Attempt['mode']): void {
  localStorage.removeItem(attemptKey(cert, round, mode))
}

// 채점 결과는 응시 상태(Attempt)와 별개로 저장한다 — plan-eng-review에서 지적된 대로,
// finishExam()이 clearAttempt를 부르는 순간 결과 화면에서 새로고침하면 결과가 통째로
// 사라지는 문제가 있었다. 결과는 사용자가 "다시풀기" 등 다음 행동을 고를 때만 지운다.
// attemptKey와 마찬가지로 mode를 키에 포함한다 — 그러지 않으면 향후 연습모드 채점이
// 추가됐을 때 같은 cert/round의 exam 결과와 practice 결과가 같은 키를 두고 서로
// 덮어쓰게 된다.
function resultKey(cert: string, round: string, mode: Attempt['mode']): string {
  return `exam-result:${cert}:${round}:${mode}`
}

export function saveResult(
  cert: string,
  round: string,
  mode: Attempt['mode'],
  result: GradeResult
): void {
  localStorage.setItem(resultKey(cert, round, mode), JSON.stringify(result))
}

export function loadResult(
  cert: string,
  round: string,
  mode: Attempt['mode']
): GradeResult | null {
  const raw = localStorage.getItem(resultKey(cert, round, mode))
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = gradeResultSchema.safeParse(parsed)
    return result.success ? (result.data as GradeResult) : null
  } catch {
    return null
  }
}

export function clearResult(cert: string, round: string, mode: Attempt['mode']): void {
  localStorage.removeItem(resultKey(cert, round, mode))
}
