import type { Question } from './types'

export interface GradeResult {
  correctCount: number
  totalCount: number
  scorePercent: number
  wrongQuestionNumbers: number[]
}

export function gradeAttempt(
  questions: Question[],
  answers: Record<number, 1 | 2 | 3 | 4>
): GradeResult {
  const wrongQuestionNumbers: number[] = []
  let correctCount = 0

  for (const q of questions) {
    if (answers[q.number] === q.answer) {
      correctCount++
    } else {
      wrongQuestionNumbers.push(q.number)
    }
  }

  return {
    correctCount,
    totalCount: questions.length,
    scorePercent: questions.length === 0 ? 0 : Math.round((correctCount / questions.length) * 100),
    wrongQuestionNumbers,
  }
}
