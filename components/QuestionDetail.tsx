// components/QuestionDetail.tsx
'use client'

import type { Question } from '@/lib/types'

export function QuestionDetail({
  question,
  selected,
  onSelect,
}: {
  question: Question
  selected: 1 | 2 | 3 | 4 | undefined
  onSelect: (choice: 1 | 2 | 3 | 4) => void
}) {
  return (
    <div className="bg-surface-card rounded-lg p-4">
      <p className="font-semibold mb-3 text-ink">
        {question.number}. {question.text}
      </p>
      <div className="space-y-2">
        {question.choices.map((choice, i) => {
          const choiceNum = (i + 1) as 1 | 2 | 3 | 4
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(choiceNum)}
              aria-pressed={selected === choiceNum}
              className={`block w-full text-left px-3 py-2 rounded-md border bg-white ${
                selected === choiceNum
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-hairline'
              }`}
            >
              {choiceNum}. {choice}
            </button>
          )
        })}
      </div>
    </div>
  )
}
