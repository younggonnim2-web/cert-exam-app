import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveAttempt,
  loadAttempt,
  clearAttempt,
  attemptKey,
  saveResult,
  loadResult,
  clearResult,
} from './examStorage'
import type { Attempt } from './types'

const sampleAttempt: Attempt = {
  cert: '유기농업기능사',
  round: '2016-07-10',
  mode: 'exam',
  answers: { 1: 2, 2: 4 },
  startedAt: 1000,
  remainingSeconds: 3000,
}

describe('examStorage', () => {
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

  it('saves and loads an attempt round-trip', () => {
    saveAttempt(sampleAttempt)
    const loaded = loadAttempt('유기농업기능사', '2016-07-10', 'exam')
    expect(loaded).toEqual(sampleAttempt)
  })

  it('returns null when no attempt is saved', () => {
    expect(loadAttempt('유기농업기능사', '2016-07-10', 'exam')).toBeNull()
  })

  it('clears a saved attempt', () => {
    saveAttempt(sampleAttempt)
    clearAttempt('유기농업기능사', '2016-07-10', 'exam')
    expect(loadAttempt('유기농업기능사', '2016-07-10', 'exam')).toBeNull()
  })

  it('builds a stable storage key', () => {
    expect(attemptKey('유기농업기능사', '2016-07-10', 'exam')).toBe(
      'exam-attempt:유기농업기능사:2016-07-10:exam'
    )
  })

  it('returns null instead of throwing when stored data is corrupted', () => {
    localStorage.setItem(attemptKey('유기농업기능사', '2016-07-10', 'exam'), '{not valid json')
    expect(loadAttempt('유기농업기능사', '2016-07-10', 'exam')).toBeNull()
  })
})

describe('exam result persistence', () => {
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

  const sampleResult = {
    correctCount: 40,
    totalCount: 60,
    scorePercent: 67,
    wrongQuestionNumbers: [3, 7, 15],
  }

  it('saves and loads a result round-trip', () => {
    saveResult('유기농업기능사', '2016-07-10', sampleResult)
    expect(loadResult('유기농업기능사', '2016-07-10')).toEqual(sampleResult)
  })

  it('returns null when no result is saved', () => {
    expect(loadResult('유기농업기능사', '2016-07-10')).toBeNull()
  })

  it('clears a saved result', () => {
    saveResult('유기농업기능사', '2016-07-10', sampleResult)
    clearResult('유기농업기능사', '2016-07-10')
    expect(loadResult('유기농업기능사', '2016-07-10')).toBeNull()
  })
})
