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
      {question.stemImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.stemImage}
          alt={`${question.number}번 문제 그림`}
          className="mb-3 max-w-full rounded-md border border-hairline"
        />
      )}
      <div className="space-y-2">
        {question.choices.map((choice, i) => {
          const choiceNum = (i + 1) as 1 | 2 | 3 | 4
          const choiceImage = question.choiceImages?.[i]
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
              {choiceImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={choiceImage}
                  alt={`${choiceNum}번 보기 그림`}
                  className="mt-1 max-h-32 rounded border border-hairline"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
