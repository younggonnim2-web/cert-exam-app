// lib/getRounds.test.ts
import { describe, it, expect } from 'vitest'
import { certExists, roundExists } from './getRounds'

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
})
