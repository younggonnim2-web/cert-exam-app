// components/OmrGrid.tsx
'use client'

import type { Question } from '@/lib/types'

export function OmrGrid({
  questions,
  answers,
  currentQuestionNumber,
  onNavigate,
}: {
  questions: Question[]
  answers: Record<number, 1 | 2 | 3 | 4>
  currentQuestionNumber: number
  onNavigate: (questionNumber: number) => void
}) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
      {questions.map((q) => {
        const isAnswered = answers[q.number] !== undefined
        const isCurrent = q.number === currentQuestionNumber
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onNavigate(q.number)}
            aria-label={`${q.number}번 문항, ${isAnswered ? '응답완료' : '미응답'}`}
            aria-current={isCurrent ? 'true' : undefined}
            className={`min-h-11 min-w-11 text-xs rounded-md border bg-white ${
              isCurrent
                ? 'border-2 border-blue-500 font-semibold text-ink'
                : isAnswered
                  ? 'bg-blue-50 border-blue-300 text-ink'
                  : 'border-hairline text-gray-400'
            }`}
          >
            {q.number}
          </button>
        )
      })}
    </div>
  )
}
