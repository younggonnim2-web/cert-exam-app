import { describe, it, expect, beforeEach, vi } from 'vitest'
import { recordWrongAnswer, getWrongHistory, recordExamAttempt, getExamAttempts } from './examHistory'

describe('examHistory', () => {
  beforeEach(() => {
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
    })
  })

  it('records a wrong answer', () => {
    recordWrongAnswer({
      cert: '조경기능사',
      round: '2016-07-10',
      mode: 'exam',
      questionNumber: 5,
      chosenAnswer: 2,
      attemptDate: '2026-08-20',
    })
    expect(getWrongHistory()).toHaveLength(1)
  })

  it('deduplicates the same question/mode/round/cert on the same attempt date, keeping the latest chosen answer', () => {
    recordWrongAnswer({
      cert: '조경기능사',
      round: '2016-07-10',
      mode: 'exam',
      questionNumber: 5,
      chosenAnswer: 2,
      attemptDate: '2026-08-20',
    })
    recordWrongAnswer({
      cert: '조경기능사',
      round: '2016-07-10',
      mode: 'exam',
      questionNumber: 5,
      chosenAnswer: 3,
      attemptDate: '2026-08-20',
    })
    const history = getWrongHistory()
    expect(history).toHaveLength(1)
    expect(history[0].chosenAnswer).toBe(3)
  })

  it('keeps a separate entry when the same question is wrong again on a different attempt date', () => {
    recordWrongAnswer({
      cert: '조경기능사',
      round: '2016-07-10',
      mode: 'exam',
      questionNumber: 5,
      chosenAnswer: 2,
      attemptDate: '2026-08-20',
    })
    recordWrongAnswer({
      cert: '조경기능사',
      round: '2016-07-10',
      mode: 'exam',
      questionNumber: 5,
      chosenAnswer: 2,
      attemptDate: '2026-08-21',
    })
    expect(getWrongHistory()).toHaveLength(2)
  })

  it('keeps exam and practice entries for the same question/date separate', () => {
    recordWrongAnswer({
      cert: '조경기능사',
      round: '2016-07-10',
      mode: 'exam',
      questionNumber: 5,
      chosenAnswer: 2,
      attemptDate: '2026-08-20',
    })
    recordWrongAnswer({
      cert: '조경기능사',
      round: '2016-07-10',
      mode: 'practice',
      questionNumber: 5,
      chosenAnswer: 2,
      attemptDate: '2026-08-20',
    })
    expect(getWrongHistory()).toHaveLength(2)
  })

  it('returns an empty array instead of crashing when localStorage holds corrupted JSON', () => {
    localStorage.setItem('exam-wrong-history', '{ not valid json')
    expect(getWrongHistory()).toEqual([])
  })

  it('returns an empty array instead of crashing when localStorage holds a value that fails schema validation', () => {
    localStorage.setItem('exam-wrong-history', JSON.stringify([{ cert: '조경기능사' }]))
    expect(getWrongHistory()).toEqual([])
  })
})

describe('exam attempt summaries', () => {
  beforeEach(() => {
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
    })
  })

  const sampleAttempt = {
    cert: '조경기능사',
    round: '2016-07-10',
    attemptDate: '2026-08-20',
    correctCount: 40,
    totalCount: 58,
    scorePercent: 69,
    passed: true,
  }

  it('records an exam attempt summary', () => {
    recordExamAttempt(sampleAttempt)
    expect(getExamAttempts()).toEqual([sampleAttempt])
  })

  it('overwrites the same day/cert/round attempt with the latest result instead of duplicating', () => {
    recordExamAttempt(sampleAttempt)
    const retake = { ...sampleAttempt, correctCount: 50, scorePercent: 86 }
    recordExamAttempt(retake)
    const attempts = getExamAttempts()
    expect(attempts).toHaveLength(1)
    expect(attempts[0]).toEqual(retake)
  })

  it('keeps a separate entry when the same cert/round is retaken on a different day', () => {
    recordExamAttempt(sampleAttempt)
    recordExamAttempt({ ...sampleAttempt, attemptDate: '2026-08-21' })
    expect(getExamAttempts()).toHaveLength(2)
  })

  it('returns an empty array instead of crashing when localStorage holds corrupted JSON', () => {
    localStorage.setItem('exam-attempt-history', '{ not valid json')
    expect(getExamAttempts()).toEqual([])
  })

  it('returns an empty array instead of crashing when localStorage holds a value that fails schema validation', () => {
    localStorage.setItem('exam-attempt-history', JSON.stringify([{ cert: '조경기능사' }]))
    expect(getExamAttempts()).toEqual([])
  })
})
