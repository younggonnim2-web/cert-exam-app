// lib/types.ts

export interface Question {
  id: string // `${cert}-${round}-${number}` 형식, 예: "유기농업기능사-2016-07-10-001"
  number: number // 문제 번호 (1부터 시작)
  text: string
  choices: [string, string, string, string]
  answer: 1 | 2 | 3 | 4 // 1-indexed 정답 번호
  subject: string // 과목명, 예: "작물재배"
}

export interface ExamMeta {
  certName: string
  totalQuestions: number
  timeLimitMinutes: number
  passingScore: number // 100점 만점 기준 합격 점수
  subjects: string[] // 과목명 목록, 문제 순서와 일치
}

export interface RoundInfo {
  cert: string
  date: string // YYYY-MM-DD
  questionCount: number
}

export interface Attempt {
  cert: string
  round: string
  mode: 'exam' | 'practice'
  answers: Record<number, 1 | 2 | 3 | 4> // key: 문제 번호
  startedAt: number // epoch ms
  remainingSeconds?: number // exam 모드에서만 사용
}

export interface WrongAnswerEntry {
  cert: string
  round: string // 회차 시행일(YYYY-MM-DD) — 문항 데이터 조회용
  mode: 'exam' | 'practice'
  questionNumber: number
  chosenAnswer: 1 | 2 | 3 | 4
  attemptDate: string // 실제 푼 날짜(YYYY-MM-DD), 회차 시행일과 다름
}
