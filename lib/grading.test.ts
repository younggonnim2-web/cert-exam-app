import { describe, it, expect } from 'vitest'
import { gradeAttempt } from './grading'
import type { Question } from './types'

const questions: Question[] = [
  { id: 'q1', number: 1, text: '', choices: ['a', 'b', 'c', 'd'], answer: 2, subject: 's1' },
  { id: 'q2', number: 2, text: '', choices: ['a', 'b', 'c', 'd'], answer: 4, subject: 's1' },
  { id: 'q3', number: 3, text: '', choices: ['a', 'b', 'c', 'd'], answer: 1, subject: 's2' },
]

describe('gradeAttempt', () => {
  it('counts correct and wrong answers, including unanswered as wrong', () => {
    const result = gradeAttempt(questions, { 1: 2, 2: 1 }) // 3번은 미응답
    expect(result.correctCount).toBe(1)
    expect(result.wrongQuestionNumbers).toEqual([2, 3])
    expect(result.scorePercent).toBe(Math.round((1 / 3) * 100))
  })

  it('returns 100 when all answers are correct', () => {
    const result = gradeAttempt(questions, { 1: 2, 2: 4, 3: 1 })
    expect(result.scorePercent).toBe(100)
    expect(result.wrongQuestionNumbers).toEqual([])
  })

  it('returns 0 (not NaN) when there are no questions', () => {
    const result = gradeAttempt([], {})
    expect(result.scorePercent).toBe(0)
    expect(result.wrongQuestionNumbers).toEqual([])
  })
})
