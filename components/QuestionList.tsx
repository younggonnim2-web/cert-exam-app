// components/QuestionList.tsx
'use client'

import { useEffect, useState } from 'react'
import { loadAttempt, saveAttempt } from '@/lib/examStorage'
import { recordWrongAnswer } from '@/lib/examHistory'
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

  function handleSelect(questionNumber: number, choice: 1 | 2 | 3 | 4, correctAnswer: 1 | 2 | 3 | 4) {
    const next = { ...selected, [questionNumber]: choice }
    setSelected(next)
    saveAttempt({ cert, round, mode: 'practice', answers: next, startedAt: Date.now() })

    if (choice !== correctAnswer) {
      recordWrongAnswer({
        cert,
        round,
        mode: 'practice',
        questionNumber,
        chosenAnswer: choice,
        attemptDate: new Date().toISOString().slice(0, 10),
      })
    }
  }

  // 방어적 빈 상태: 현재 실 데이터(회차 50개)에는 발생하지 않지만(meta.json subjects
  // 전부 비어있지 않음을 확인), subjects가 비어 있으면 activeSubject가 undefined가 되어
  // questions.filter가 조용히 빈 배열만 내놓는다 — 화면에 아무 설명 없이 텅 빈 채로
  // 남는다. lib/parseExam.ts와 동일한 "조용히 실패하지 않는다" 원칙에 따라 명시적으로
  // 알린다.
  if (subjects.length === 0) {
    return <p className="text-sm text-muted">이 회차에 등록된 과목이 없습니다.</p>
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
        {visible.map((q) => {
          const isAnswered = selected[q.number] !== undefined
          return (
            <li key={q.id} className="bg-surface-card rounded-lg p-4">
              <p className="font-semibold mb-2 text-ink">
                {q.number}. {q.text}
              </p>
              <div className="space-y-1">
                {q.choices.map((choice, i) => {
                  const choiceNum = (i + 1) as 1 | 2 | 3 | 4
                  const isSelected = selected[q.number] === choiceNum
                  const isCorrectChoice = choiceNum === q.answer
                  // 색상만으로 정오답을 구분하면 WCAG 1.4.1(색상 단독 사용 금지) 위반이다.
                  // 시각적으로는 정답 라벨에 텍스트 접미사를 덧붙이고, 스크린리더에는
                  // aria-label로 각 보기의 상태를 명시적으로 전달한다. 색상 스타일은
                  // 그대로 유지하고(제거 아님) 텍스트/aria를 추가하는 방식이다.
                  const statusSuffix = !isAnswered
                    ? ''
                    : isCorrectChoice
                      ? ', 정답'
                      : isSelected
                        ? ', 선택한 오답'
                        : ', 선택 안 함'
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelect(q.number, choiceNum, q.answer)}
                      aria-pressed={isSelected}
                      aria-label={`${choiceNum}번. ${choice}${statusSuffix}`}
                      className={`block w-full text-left px-3 py-2 rounded-md border bg-white ${
                        isAnswered && isCorrectChoice
                          ? 'border-emerald-500 bg-emerald-50'
                          : isSelected
                            ? 'border-red-500 bg-red-50'
                            : 'border-hairline'
                      }`}
                    >
                      {choiceNum}. {choice}
                      {isAnswered && isCorrectChoice ? ' (정답)' : ''}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
