// lib/examMeta.ts
import type { ExamMeta } from './types'

export function validateExamMeta(value: unknown): asserts value is ExamMeta {
  if (typeof value !== 'object' || value === null) {
    throw new Error('examMeta must be an object')
  }
  const v = value as Record<string, unknown>
  if (typeof v.certName !== 'string') throw new Error('certName must be a string')
  if (typeof v.totalQuestions !== 'number') throw new Error('totalQuestions must be a number')
  if (typeof v.timeLimitMinutes !== 'number') throw new Error('timeLimitMinutes must be a number')
  if (typeof v.passingScore !== 'number') throw new Error('passingScore must be a number')
  if (!Array.isArray(v.subjects) || !v.subjects.every((s) => typeof s === 'string')) {
    throw new Error('subjects must be a string array')
  }
}
