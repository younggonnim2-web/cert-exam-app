import type { Attempt } from './types'
import type { GradeResult } from './grading'

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
    return JSON.parse(raw) as Attempt
  } catch {
    // 손상된 데이터(사파리 프라이빗 모드 등)는 새로 시작한 것으로 취급 — 크래시 대신 조용히 무시
    return null
  }
}

export function clearAttempt(cert: string, round: string, mode: Attempt['mode']): void {
  localStorage.removeItem(attemptKey(cert, round, mode))
}

// 채점 결과는 응시 상태(Attempt)와 별개로 저장한다 — plan-eng-review에서 지적된 대로,
// finishExam()이 clearAttempt를 부르는 순간 결과 화면에서 새로고침하면 결과가 통째로
// 사라지는 문제가 있었다. 결과는 사용자가 "다시풀기" 등 다음 행동을 고를 때만 지운다.
function resultKey(cert: string, round: string): string {
  return `exam-result:${cert}:${round}`
}

export function saveResult(cert: string, round: string, result: GradeResult): void {
  localStorage.setItem(resultKey(cert, round), JSON.stringify(result))
}

export function loadResult(cert: string, round: string): GradeResult | null {
  const raw = localStorage.getItem(resultKey(cert, round))
  if (!raw) return null
  try {
    return JSON.parse(raw) as GradeResult
  } catch {
    return null
  }
}

export function clearResult(cert: string, round: string): void {
  localStorage.removeItem(resultKey(cert, round))
}
