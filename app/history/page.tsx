// app/history/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getWrongHistory } from '@/lib/examHistory'
import type { Question, WrongAnswerEntry } from '@/lib/types'

type QuestionCache = Record<string, Question | null> // key: `${cert}:${round}:${questionNumber}`

export default function HistoryPage() {
  const [history, setHistory] = useState<WrongAnswerEntry[] | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [questionCache, setQuestionCache] = useState<QuestionCache>({})

  // getWrongHistory()는 localStorage를 읽으므로 클라이언트에서만, 마운트 시 1회 로드한다.
  useEffect(() => {
    setHistory(getWrongHistory())
  }, [])

  const grouped = useMemo(() => {
    if (!history) return []
    const byCert = new Map<string, WrongAnswerEntry[]>()
    for (const entry of history) {
      const list = byCert.get(entry.cert) ?? []
      list.push(entry)
      byCert.set(entry.cert, list)
    }
    return [...byCert.entries()].map(([cert, entries]) => {
      const byDate = new Map<string, WrongAnswerEntry[]>()
      for (const entry of entries) {
        const list = byDate.get(entry.attemptDate) ?? []
        list.push(entry)
        byDate.set(entry.attemptDate, list)
      }
      const dates = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
      return { cert, dates }
    })
  }, [history])

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

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted">
        ← 뒤로
      </Link>
      <h1 className="text-2xl font-semibold mb-2 text-ink">오답 이력</h1>
      <p className="text-sm text-muted mb-6">
        이 기록은 이 브라우저에만 저장되며, 브라우저 데이터를 지우면 함께 사라집니다.
      </p>

      {history === null && <p className="text-muted">불러오는 중...</p>}

      {history !== null && grouped.length === 0 && (
        <p className="text-muted">아직 기록된 오답이 없습니다.</p>
      )}

      <div className="space-y-8">
        {grouped.map(({ cert, dates }) => (
          <section key={cert}>
            <h2 className="text-lg font-semibold mb-3 text-ink">{cert}</h2>
            <div className="space-y-4">
              {dates.map(([date, entries]) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-muted mb-2">{date}</h3>
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
                            <span className="text-muted"> ({entry.mode === 'exam' ? '전체 모의고사' : '과목별 연습'})</span>
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
          </section>
        ))}
      </div>
    </main>
  )
}
