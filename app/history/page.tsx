// app/history/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getWrongHistory, getExamAttempts } from '@/lib/examHistory'
import type { ExamAttemptSummary, WrongAnswerEntry } from '@/lib/types'

interface PracticeGroup {
  round: string
  attemptDate: string
  wrongCount: number
}

export default function HistoryPage() {
  const [history, setHistory] = useState<WrongAnswerEntry[] | null>(null)
  const [attempts, setAttempts] = useState<ExamAttemptSummary[] | null>(null)

  // localStorage는 클라이언트에서만 읽을 수 있으므로 마운트 시 1회 로드한다.
  useEffect(() => {
    setHistory(getWrongHistory())
    setAttempts(getExamAttempts())
  }, [])

  const grouped = useMemo(() => {
    if (!history || !attempts) return []

    // 모의고사·과목별 연습 둘 다 "회차+응시일당 오답 개수" 요약만 목록에 보여주고,
    // 실제 문항은 상세 페이지(/history/[cert]/[round]/[date]/[mode])에서 확인한다 —
    // 두 모드를 완전히 같은 방식으로 다룬다.
    const practiceWrongByCert = new Map<string, Map<string, PracticeGroup>>()
    const examWrongCount = new Map<string, number>()
    for (const entry of history) {
      if (entry.mode === 'exam') {
        const key = `${entry.cert}:${entry.round}:${entry.attemptDate}`
        examWrongCount.set(key, (examWrongCount.get(key) ?? 0) + 1)
        continue
      }
      const byRoundDate = practiceWrongByCert.get(entry.cert) ?? new Map<string, PracticeGroup>()
      const key = `${entry.round}:${entry.attemptDate}`
      const group = byRoundDate.get(key) ?? {
        round: entry.round,
        attemptDate: entry.attemptDate,
        wrongCount: 0,
      }
      group.wrongCount += 1
      byRoundDate.set(key, group)
      practiceWrongByCert.set(entry.cert, byRoundDate)
    }

    const attemptsByCert = new Map<string, ExamAttemptSummary[]>()
    for (const attempt of attempts) {
      const list = attemptsByCert.get(attempt.cert) ?? []
      list.push(attempt)
      attemptsByCert.set(attempt.cert, list)
    }

    // 응시/연습 기록 중 하나라도 있는 자격증은 전부 놓치지 않도록, 두 이력에 등장하는
    // 자격증 전체의 합집합을 기준으로 순회한다.
    const certs = new Set([...practiceWrongByCert.keys(), ...attemptsByCert.keys()])

    return [...certs].map((cert) => {
      const practiceGroups = [...(practiceWrongByCert.get(cert)?.values() ?? [])].sort((a, b) =>
        a.attemptDate < b.attemptDate ? 1 : -1
      )

      const examGroups = [...(attemptsByCert.get(cert) ?? [])]
        .map((attempt) => ({
          ...attempt,
          wrongCount:
            examWrongCount.get(`${attempt.cert}:${attempt.round}:${attempt.attemptDate}`) ?? 0,
        }))
        .sort((a, b) => (a.attemptDate < b.attemptDate ? 1 : -1))

      return { cert, examGroups, practiceGroups }
    })
  }, [history, attempts])

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
        {grouped.map(({ cert, examGroups, practiceGroups }) => (
          <section key={cert}>
            <h2 className="text-lg font-semibold mb-3 text-ink">{cert}</h2>

            {examGroups.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-muted mb-2">응시 기록 (전체 모의고사)</h3>
                <ul className="space-y-2">
                  {examGroups.map((attempt) => (
                    <li key={`${attempt.round}:${attempt.attemptDate}`}>
                      <Link
                        href={`/history/${encodeURIComponent(attempt.cert)}/${encodeURIComponent(attempt.round)}/${attempt.attemptDate}/exam`}
                        className="block bg-surface-card rounded-lg p-3 text-sm text-ink hover:bg-gray-100"
                      >
                        {/* 날짜/회차와 점수를 같은 줄에 좌우로 배치하면(justify-between)
                            좁은 화면에서 서로 밀려 겹치거나 줄바꿈이 깨진다 — 세로로
                            쌓아 폭에 상관없이 항상 안전하게 줄바꿈되도록 한다. */}
                        <span>
                          학습일: {attempt.attemptDate}
                          <span className="text-muted"> · 회차: {attempt.round}</span>
                        </span>
                        <p
                          className={`mt-1 font-medium ${
                            attempt.passed ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {attempt.correctCount}/{attempt.totalCount} · {attempt.scorePercent}점 ·{' '}
                          {attempt.passed ? '합격' : '불합격'}
                        </p>
                        <p className="text-muted mt-1">오답 {attempt.wrongCount}문항 · 상세 보기 →</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {practiceGroups.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted mb-2">연습 기록 (과목별 연습)</h3>
                <ul className="space-y-2">
                  {practiceGroups.map((group) => (
                    <li key={`${group.round}:${group.attemptDate}`}>
                      <Link
                        href={`/history/${encodeURIComponent(cert)}/${encodeURIComponent(group.round)}/${group.attemptDate}/practice`}
                        className="block bg-surface-card rounded-lg p-3 text-sm text-ink hover:bg-gray-100"
                      >
                        <span>
                          학습일: {group.attemptDate}
                          <span className="text-muted"> · 회차: {group.round}</span>
                        </span>
                        <p className="text-muted mt-1">오답 {group.wrongCount}문항 · 상세 보기 →</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}
