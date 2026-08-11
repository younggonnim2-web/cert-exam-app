// lib/examMeta.test.ts
import { describe, it, expect } from 'vitest'
import { validateExamMeta } from './examMeta'

describe('validateExamMeta', () => {
  it('accepts a well-formed meta object', () => {
    const meta = {
      certName: '테스트자격증',
      totalQuestions: 60,
      timeLimitMinutes: 60,
      passingScore: 60,
      subjects: ['과목1', '과목2'],
    }
    expect(() => validateExamMeta(meta)).not.toThrow()
  })

  it('rejects a meta object missing required fields', () => {
    const meta = { certName: '테스트자격증' }
    expect(() => validateExamMeta(meta)).toThrow()
  })
})
