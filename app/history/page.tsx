// app/history/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getWrongHistory, getExamAttempts } from '@/lib/examHistory'
import type { ExamAttemptSummary, Question, WrongAnswerEntry } from '@/lib/types'

type QuestionCache = Record<string, Question | null> // key: `${cert}:${round}:${questionNumber}`

export default function HistoryPage() {
  const [history, setHistory] = useState<WrongAnswerEntry[] | null>(null)
  const [attempts, setAttempts] = useState<ExamAttemptSummary[] | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [questionCache, setQuestionCache] = useState<QuestionCache>({})

  // localStorage는 클라이언트에서만 읽을 수 있으므로 마운트 시 1회 로드한다.
  useEffect(() => {
    setHistory(getWrongHistory())
    setAttempts(getExamAttempts())
  }, [])

  const grouped = useMemo(() => {
    if (!history || !attempts) return []

    const wrongByCert = new Map<string, WrongAnswerEntry[]>()
    for (const entry of history) {
      const list = wrongByCert.get(entry.cert) ?? []
      list.push(entry)
      wrongByCert.set(entry.cert, list)
    }
    const attemptsByCert = new Map<string, ExamAttemptSummary[]>()
    for (const attempt of attempts) {
      const list = attemptsByCert.get(attempt.cert) ?? []
      list.push(attempt)
      attemptsByCert.set(attempt.cert, list)
    }

    // 응시 기록만 있고 오답은 하나도 없는 자격증(만점 응시 등)도 놓치지 않도록,
    // 두 이력에 등장하는 자격증 전체의 합집합을 기준으로 순회한다.
    const certs = new Set([...wrongByCert.keys(), ...attemptsByCert.keys()])

    return [...certs].map((cert) => {
      const wrongEntries = wrongByCert.get(cert) ?? []
      const byDate = new Map<string, WrongAnswerEntry[]>()
      for (const entry of wrongEntries) {
        const list = byDate.get(entry.attemptDate) ?? []
        list.push(entry)
        byDate.set(entry.attemptDate, list)
      }
      const dates = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))

      const certAttempts = [...(attemptsByCert.get(cert) ?? [])].sort((a, b) =>
        a.attemptDate < b.attemptDate ? 1 : -1
      )

      return { cert, dates, attempts: certAttempts }
    })
  }, [history, attempts])

  async function toggleDetail(entry: WrongAnswerEntry, key: string) {
    if (expandedKey === key) {
      setExpandedKey(null)
      return
    }
    setExpandedKey(key)

    const cacheKey = `${entry.cert}:${entry.round}:${entry.questionNumber}`
    if (cacheKey in questionCache) return

    try {
      const res = await fetch(
        `/api/questions?cert=${encodeURIComponent(entry.cert)}&round=${encodeURIComponent(entry.round)}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: { questions: Question[] } = await res.json()
      const question = data.questions.find((q) => q.number === entry.questionNumber) ?? null
      setQuestionCache((prev) => ({ ...prev, [cacheKey]: question }))
    } catch {
      setQuestionCache((prev) => ({ ...prev, [cacheKey]: null }))
    }
  }

  const isLoading = history === null || attempts === null

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted">
        ← 뒤로
      </Link>
      <h1 className="text-2xl font-semibold mb-2 text-ink">학습 기록</h1>
      <p className="text-sm text-muted mb-6">
        이 기록은 이 브라우저에만 저장되며, 브라우저 데이터를 지우면 함께 사라집니다.
      </p>

      {isLoading && <p className="text-muted">불러오는 중...</p>}

      {!isLoading && grouped.length === 0 && (
        <p className="text-muted">아직 기록된 응시 결과나 오답이 없습니다.</p>
      )}

      <div className="space-y-8">
        {grouped.map(({ cert, dates, attempts: certAttempts }) => (
          <section key={cert}>
            <h2 className="text-lg font-semibold mb-3 text-ink">{cert}</h2>

            {certAttempts.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-muted mb-2">응시 기록 (전체 모의고사)</h3>
                <ul className="space-y-2">
                  {certAttempts.map((attempt) => (
                    <li
                      key={`${attempt.round}:${attempt.attemptDate}`}
                      className="bg-surface-card rounded-lg p-3 text-sm text-ink flex justify-between items-center"
                    >
                      <span>
                        {attempt.attemptDate} · {attempt.round} 회차
                      </span>
                      <span
                        className={
                          attempt.passed ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'
                        }
                      >
                        {attempt.correctCount}/{attempt.totalCount} · {attempt.scorePercent}점 ·{' '}
                        {attempt.passed ? '합격' : '불합격'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dates.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted">오답 문항</h3>
                {dates.map(([date, entries]) => (
                  <div key={date}>
                    <h4 className="text-sm font-medium text-muted mb-2">{date}</h4>
                    <ul className="space-y-2">
                      {entries.map((entry) => {
                        const key = `${entry.cert}:${entry.round}:${entry.mode}:${entry.questionNumber}:${entry.attemptDate}`
                        const cacheKey = `${entry.cert}:${entry.round}:${entry.questionNumber}`
                        const question = questionCache[cacheKey]
                        const isExpanded = expandedKey === key
                        return (
                          <li key={key} className="bg-surface-card rounded-lg p-3">
                            <button
                              type="button"
                              onClick={() => toggleDetail(entry, key)}
                              className="w-full text-left text-sm text-ink"
                            >
                              {entry.round} 회차 · {entry.questionNumber}번
                              <span className="text-muted">
                                {' '}
                                ({entry.mode === 'exam' ? '전체 모의고사' : '과목별 연습'})
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="mt-3 border-t border-hairline pt-3">
                                {question === undefined && (
                                  <p className="text-sm text-muted">불러오는 중...</p>
                                )}
                                {question === null && (
                                  <p className="text-sm text-muted">문항을 불러오지 못했습니다.</p>
                                )}
                                {question && (
                                  <div>
                                    <p className="font-medium mb-2 text-ink">
                                      {question.number}. {question.text}
                                    </p>
                                    <div className="space-y-1">
                                      {question.choices.map((choice, i) => {
                                        const choiceNum = (i + 1) as 1 | 2 | 3 | 4
                                        const isCorrectChoice = choiceNum === question.answer
                                        const isChosen = choiceNum === entry.chosenAnswer
                                        return (
                                          <p
                                            key={i}
                                            className={`px-3 py-1.5 rounded-md border text-sm ${
                                              isCorrectChoice
                                                ? 'border-emerald-500 bg-emerald-50 text-ink'
                                                : isChosen
                                                  ? 'border-red-500 bg-red-50 text-ink'
                                                  : 'border-hairline text-ink'
                                            }`}
                                          >
                                            {choiceNum}. {choice}
                                            {isCorrectChoice ? ' (정답)' : isChosen ? ' (선택한 오답)' : ''}
                                          </p>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}
