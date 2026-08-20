// app/history/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getWrongHistory, getExamAttempts } from '@/lib/examHistory'
import { WrongQuestionReview } from '@/components/WrongQuestionReview'
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

    // 모의고사 오답은 "응시 기록"에서 상세 페이지로 넘겨 보여주므로, 여기서는
    // 과목별 연습 오답만 날짜별로 묶는다(전체 모의고사 오답을 두 군데 겹쳐 보여주지
    // 않기 위함).
    const practiceWrongByCert = new Map<string, WrongAnswerEntry[]>()
    for (const entry of history) {
      if (entry.mode !== 'practice') continue
      const list = practiceWrongByCert.get(entry.cert) ?? []
      list.push(entry)
      practiceWrongByCert.set(entry.cert, list)
    }

    // 응시 기록 각 건에 "그날 그 회차에서 틀린 문항 수"를 붙인다 — 목록에는 개수만
    // 보여주고, 실제 문항은 상세 페이지에서 확인한다.
    const examWrongCount = new Map<string, number>()
    for (const entry of history) {
      if (entry.mode !== 'exam') continue
      const key = `${entry.cert}:${entry.round}:${entry.attemptDate}`
      examWrongCount.set(key, (examWrongCount.get(key) ?? 0) + 1)
    }

    const attemptsByCert = new Map<string, ExamAttemptSummary[]>()
    for (const attempt of attempts) {
      const list = attemptsByCert.get(attempt.cert) ?? []
      list.push(attempt)
      attemptsByCert.set(attempt.cert, list)
    }

    // 응시 기록만 있고 연습 오답은 하나도 없는 자격증(연습 없이 모의고사만 본 경우)도
    // 놓치지 않도록, 두 이력에 등장하는 자격증 전체의 합집합을 기준으로 순회한다.
    const certs = new Set([...practiceWrongByCert.keys(), ...attemptsByCert.keys()])

    return [...certs].map((cert) => {
      const wrongEntries = practiceWrongByCert.get(cert) ?? []
      const byDate = new Map<string, WrongAnswerEntry[]>()
      for (const entry of wrongEntries) {
        const list = byDate.get(entry.attemptDate) ?? []
        list.push(entry)
        byDate.set(entry.attemptDate, list)
      }
      const dates = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))

      const certAttempts = [...(attemptsByCert.get(cert) ?? [])]
        .map((attempt) => ({
          ...attempt,
          wrongCount:
            examWrongCount.get(`${attempt.cert}:${attempt.round}:${attempt.attemptDate}`) ?? 0,
        }))
        .sort((a, b) => (a.attemptDate < b.attemptDate ? 1 : -1))

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
                    <li key={`${attempt.round}:${attempt.attemptDate}`}>
                      <Link
                        href={`/history/${encodeURIComponent(attempt.cert)}/${encodeURIComponent(attempt.round)}/${attempt.attemptDate}`}
                        className="block bg-surface-card rounded-lg p-3 text-sm text-ink hover:bg-gray-100"
                      >
                        <div className="flex justify-between items-center">
                          <span>
                            학습일: {attempt.attemptDate}
                            <span className="text-muted"> · 회차: {attempt.round}</span>
                          </span>
                          <span
                            className={
                              attempt.passed
                                ? 'text-emerald-600 font-medium'
                                : 'text-red-600 font-medium'
                            }
                          >
                            {attempt.correctCount}/{attempt.totalCount} · {attempt.scorePercent}점 ·{' '}
                            {attempt.passed ? '합격' : '불합격'}
                          </span>
                        </div>
                        <p className="text-muted mt-1">오답 {attempt.wrongCount}문항 · 상세 보기 →</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dates.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted">오답 문항 (과목별 연습)</h3>
                {dates.map(([date, entries]) => (
                  <div key={date}>
                    <h4 className="text-sm font-medium text-muted mb-2">학습일: {date}</h4>
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
                              회차: {entry.round} · {entry.questionNumber}번
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
                                  <WrongQuestionReview
                                    question={question}
                                    chosenAnswer={entry.chosenAnswer}
                                  />
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
