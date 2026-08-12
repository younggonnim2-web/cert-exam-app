// lib/getRounds.test.ts
import { describe, it, expect } from 'vitest'
import { certExists, roundExists, getRounds, safeDecodeSegment } from './getRounds'

describe('경로 검증', () => {
  it('정상 자격증명은 통과한다', () => {
    expect(certExists('유기농업기능사')).toBe(true)
  })

  it('상위 디렉토리 참조가 섞인 값은 거부한다', () => {
    expect(certExists('../../../etc')).toBe(false)
    expect(roundExists('유기농업기능사', '../../../etc/passwd')).toBe(false)
    expect(roundExists('../etc', '2016-07-10')).toBe(false)
  })

  it('경로 구분자가 섞인 값은 거부한다', () => {
    expect(certExists('foo/bar')).toBe(false)
    expect(certExists('foo\\bar')).toBe(false)
  })

  it('"." 은 상위 디렉토리 자체를 가리키므로 거부한다', () => {
    expect(certExists('.')).toBe(false)
    expect(roundExists('유기농업기능사', '.')).toBe(false)
  })

  it('":" 이 섞인 값은 거부한다', () => {
    expect(certExists('foo:bar')).toBe(false)
    expect(roundExists('유기농업기능사', 'foo:bar')).toBe(false)
  })
})

describe('getRounds', () => {
  it('반환된 모든 회차는 roundExists를 만족한다 (questions.json이 실제로 존재)', () => {
    for (const cert of ['유기농업기능사', '종자기능사']) {
      const rounds = getRounds(cert)
      expect(rounds.length).toBeGreaterThan(0)
      for (const r of rounds) {
        expect(roundExists(cert, r.date)).toBe(true)
      }
    }
  })

  it('questions.json이 없는 회차(파싱 실패분)는 목록에서 제외한다', () => {
    // Task 3에서 이미지 전용 보기 등으로 파싱에 실패해 questions.json이 없는 실제 회차
    const rounds = getRounds('종자기능사')
    const dates = rounds.map((r) => r.date)
    expect(dates).not.toContain('2007-01-28')
    expect(dates).not.toContain('2010-07-11')
  })
})

describe('safeDecodeSegment', () => {
  it('percent-encoding이 없는 문자열은 그대로 반환한다', () => {
    expect(safeDecodeSegment('유기농업기능사')).toBe('유기농업기능사')
  })

  it('percent-encoded 문자열은 디코딩한다', () => {
    expect(safeDecodeSegment(encodeURIComponent('유기농업기능사'))).toBe('유기농업기능사')
  })

  it('잘못된 percent-encoding(리터럴 %)은 크래시 대신 null을 반환한다', () => {
    expect(safeDecodeSegment('자격증%A')).toBeNull()
  })
})
