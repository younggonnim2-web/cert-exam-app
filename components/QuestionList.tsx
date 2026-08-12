// components/QuestionList.tsx
'use client'

import { useEffect, useState } from 'react'
import { loadAttempt, saveAttempt } from '@/lib/examStorage'
import type { Question } from '@/lib/types'

export function QuestionList({
  cert,
  round,
  questions,
  subjects,
}: {
  cert: string
  round: string
  questions: Question[]
  subjects: string[]
}) {
  const [selected, setSelected] = useState<Record<number, 1 | 2 | 3 | 4>>({})
  const [activeSubject, setActiveSubject] = useState(subjects[0])

  // 이탈 복구: 마운트 시 저장된 답안이 있으면 불러온다
  useEffect(() => {
    const saved = loadAttempt(cert, round, 'practice')
    if (saved) setSelected(saved.answers)
  }, [cert, round])

  function handleSelect(questionNumber: number, choice: 1 | 2 | 3 | 4) {
    const next = { ...selected, [questionNumber]: choice }
    setSelected(next)
    saveAttempt({ cert, round, mode: 'practice', answers: next, startedAt: Date.now() })
  }

  const visible = questions.filter((q) => q.subject === activeSubject)

  // DESIGN.md 과목 뱃지 파스텔 — 과목 순번대로 순환 적용
  const BADGE_COLORS = ['bg-badge-orange', 'bg-badge-pink', 'bg-badge-violet', 'bg-badge-emerald']

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {subjects.map((s, i) => (
          <button
            key={s}
            onClick={() => setActiveSubject(s)}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium text-sm ${
              s === activeSubject
                ? `${BADGE_COLORS[i % BADGE_COLORS.length]} text-white`
                : 'bg-surface-soft text-muted'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <ul className="space-y-4">
        {visible.map((q) => (
          <li key={q.id} className="bg-surface-card rounded-lg p-4">
            <p className="font-semibold mb-2 text-ink">
              {q.number}. {q.text}
            </p>
            <div className="space-y-1">
              {q.choices.map((choice, i) => {
                const choiceNum = (i + 1) as 1 | 2 | 3 | 4
                const isSelected = selected[q.number] === choiceNum
                const isAnswered = selected[q.number] !== undefined
                const isCorrectChoice = choiceNum === q.answer
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(q.number, choiceNum)}
                    className={`block w-full text-left px-3 py-2 rounded-md border bg-white ${
                      isAnswered && isCorrectChoice
                        ? 'border-emerald-500 bg-emerald-50'
                        : isSelected
                          ? 'border-red-500 bg-red-50'
                          : 'border-hairline'
                    }`}
                  >
                    {choiceNum}. {choice}
                  </button>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
