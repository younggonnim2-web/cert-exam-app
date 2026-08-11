import { describe, it, expect } from 'vitest'
import { parseExam } from './parseExam'

const SAMPLE = `# 유기농업기능사 2016-07-10 필기 기출문제

- 자격증: 유기농업기능사
- 시행일: 2016-07-10

---

--- page 1 ---
유기농업기능사             ◐2016년 07월 10일 필기 기출문제 ◑
전자문제집 CBT : www.comcbt.com
최강 자격증 기출문제 전자문제집 CBT : www.comcbt.com
1. 잎의 가장자리에 있는 수공에서 물이 나오는 현상은?
   ❶ 일액현상
② 일비현상
   ③ 증산작용
④ Apoplast
2. 작물이 받는 냉해의 종류가 아닌 것은?
   ❶ 생태형냉해
② 지연형냉해
   ③ 병해형냉해
④ 장해형냉해
1과목 : 작물재배
3. 다음 중 토양의 것은?
   ① 보기1
❷ 보기2
   ③ 보기3
④ 보기4
2과목 : 토양관리
`

describe('parseExam', () => {
  it('extracts question text, choices, and 1-indexed answer', () => {
    const questions = parseExam(SAMPLE, '유기농업기능사', '2016-07-10')
    expect(questions).toHaveLength(3)
    expect(questions[0]).toEqual({
      id: '유기농업기능사-2016-07-10-001',
      number: 1,
      text: '잎의 가장자리에 있는 수공에서 물이 나오는 현상은?',
      choices: ['일액현상', '일비현상', '증산작용', 'Apoplast'],
      answer: 1,
      subject: '작물재배',
    })
  })

  it('assigns subject based on the following subject marker', () => {
    const questions = parseExam(SAMPLE, '유기농업기능사', '2016-07-10')
    expect(questions[1].subject).toBe('작물재배')
    expect(questions[2].subject).toBe('토양관리')
  })

  it('detects answer 2 correctly (bold circled digit in second position)', () => {
    const questions = parseExam(SAMPLE, '유기농업기능사', '2016-07-10')
    expect(questions[2].answer).toBe(2)
  })

  it('throws instead of silently defaulting when no bold marker is found', () => {
    const brokenSample = `--- page 1 ---
1. 정답 표시가 깨진 문제
   ① 보기1
① 보기2
   ① 보기3
① 보기4
`
    expect(() => parseExam(brokenSample, '유기농업기능사', '2099-01-01')).toThrow(
      /문항 1.*정답 표시/
    )
  })
})
