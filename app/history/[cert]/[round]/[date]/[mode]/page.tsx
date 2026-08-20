// app/history/[cert]/[round]/[date]/[mode]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getWrongHistory, getExamAttempts, countWrongOccurrences } from '@/lib/examHistory'
import { safeDecodeSegment } from '@/lib/safeDecodeSegment'
import { WrongQuestionReview } from '@/components/WrongQuestionReview'
import type { Attempt, ExamAttemptSummary, Question, WrongAnswerEntry } from '@/lib/types'

type PageStatus = 'loading' | 'error' | 'ready'
type Mode = Attempt['mode']

function isMode(value: string | null): value is Mode {
  return value === 'exam' || value === 'practice'
}

export default function AttemptDetailPage() {
  // useParams()는 percent-encoding이 남은 원문 그대로 값을 돌려준다(다른 클라이언트
  // 컴포넌트에서 실측 확인된 동일한 동작) — safeDecodeSegment로 디코딩해야 한다.
  const rawParams = useParams<{ cert: string; round: string; date: string; mode: string }>()
  const cert = safeDecodeSegment(rawParams.cert)
  const round = safeDecodeSegment(rawParams.round)
  const date = rawParams.date // YYYY-MM-DD, URL 예약문자가 없어 디코딩 불필요
  const mode = isMode(rawParams.mode) ? rawParams.mode : null

  const [status, setStatus] = useState<PageStatus>('loading')
  const [questions, setQuestions] = useState<Question[]>([])
  const [wrongEntries, setWrongEntries] = useState<WrongAnswerEntry[]>([])
  const [allWrongEntries, setAllWrongEntries] = useState<WrongAnswerEntry[]>([])
  const [attempt, setAttempt] = useState<ExamAttemptSummary | null>(null)

  useEffect(() => {
    if (cert === null || round === null || mode === null) {
      setStatus('error')
      return
    }

    // 오답/응시 요약은 localStorage에서 즉시 읽고, 문항 지문/보기만 API에서 가져온다.
    // 전체 이력(allWrongEntries)은 "이 문항을 지금까지 총 몇 번 틀렸는지" 계산에
    // 쓴다 — 이 날짜 하루로 필터링하면 항상 1이 되어 버려서 날짜 필터링 전 원본이
    // 따로 필요하다.
    const all = getWrongHistory()
    setAllWrongEntries(all)
    const entries = all.filter(
      (e) => e.cert === cert && e.round === round && e.attemptDate === date && e.mode === mode
    )
    setWrongEntries(entries)

    // 점수/합격여부 요약은 모의고사에만 존재한다 — 과목별 연습은 "제출" 개념이 없다.
    if (mode === 'exam') {
      const found = getExamAttempts().find(
        (a) => a.cert === cert && a.round === round && a.attemptDate === date
      )
      setAttempt(found ?? null)
    }

    fetch(`/api/questions?cert=${encodeURIComponent(cert)}&round=${encodeURIComponent(round)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<{ questions: Question[] }>
      })
      .then((data) => {
        setQuestions(data.questions)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [cert, round, date, mode])

  if (status === 'loading') {
    return <main className="mx-auto max-w-2xl p-6">불러오는 중...</main>
  }

  if (status === 'error' || cert === null || round === null || mode === null) {
    return (
      <main className="mx-auto max-w-2xl p-6 text-center">
        <p className="text-red-600 mb-4">기록을 불러오지 못했습니다.</p>
        <Link href="/history" className="text-sm text-muted underline">
          학습 기록으로 돌아가기
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/history" className="mb-4 inline-flex items-center gap-1 text-sm text-muted">
        ← 학습 기록으로
      </Link>
      <h1 className="text-xl font-semibold mb-1 text-ink">{cert}</h1>
      <p className="text-sm text-muted mb-4">
        학습일: {date} · 회차: {round} ·{' '}
        {mode === 'exam' ? '전체 모의고사' : '과목별 연습'}
      </p>

      {attempt && (
        <div
          className={`rounded-xl p-4 mb-6 ${
            attempt.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          <p className="font-semibold">
            {attempt.correctCount} / {attempt.totalCount} 정답 ({attempt.scorePercent}점) ·{' '}
            {attempt.passed ? '합격' : '불합격'}
          </p>
        </div>
      )}

      <h2 className="text-sm font-medium text-muted mb-3">오답 {wrongEntries.length}문항</h2>

      {wrongEntries.length === 0 ? (
        <p className="text-muted">이 기록에는 남아있는 오답이 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {wrongEntries
            .slice()
            .sort((a, b) => a.questionNumber - b.questionNumber)
            .map((entry) => {
              const question = questions.find((q) => q.number === entry.questionNumber)
              if (!question) return null
              const timesWrong = countWrongOccurrences(
                allWrongEntries,
                cert,
                round,
                mode,
                entry.questionNumber
              )
              return (
                <div key={entry.questionNumber} className="bg-surface-card rounded-lg p-3">
                  <WrongQuestionReview
                    question={question}
                    chosenAnswer={entry.chosenAnswer}
                    timesWrong={timesWrong}
                  />
                </div>
              )
            })}
        </div>
      )}
    </main>
  )
}
