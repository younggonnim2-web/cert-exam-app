// components/QuestionList.tsx
'use client'

import { useEffect, useState } from 'react'
import { loadAttempt, saveAttempt, clearAttempt } from '@/lib/examStorage'
import { recordWrongAnswer } from '@/lib/examHistory'
import type { Question } from '@/lib/types'

type Status = 'checking' | 'resume-prompt' | 'active'

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
  // 회차를 다시 선택해 들어올 때마다 예전 답안이 아무 안내 없이 그대로 남아있던
  // 문제(실사용 중 발견 — 회차 선택 화면을 다시 거쳐 들어와도 초기화가 안 됨) —
  // exam/page.tsx가 이미 쓰는 것과 같은 "이어풀기/새로 시작" 확인창을 여기도 둔다.
  // 'checking' 동안은 화면에 아무것도 그리지 않아, 저장된 답안이 잠깐 보였다가
  // 확인창으로 바뀌는 깜빡임을 막는다.
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    const saved = loadAttempt(cert, round, 'practice')
    if (saved && Object.keys(saved.answers).length > 0) {
      setStatus('resume-prompt')
    } else {
      setStatus('active')
    }
  }, [cert, round])

  function resumeSaved() {
    const saved = loadAttempt(cert, round, 'practice')
    if (saved) setSelected(saved.answers)
    setStatus('active')
  }

  function startFresh() {
    clearAttempt(cert, round, 'practice')
    setSelected({})
    setStatus('active')
  }

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

  if (status === 'checking') {
    return null
  }

  if (status === 'resume-prompt') {
    return (
      <div className="text-center py-6">
        <p className="mb-4 text-ink">이전에 학습하던 기록이 있습니다.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={resumeSaved}
            className="rounded-md bg-blue-500 text-white px-4 py-2 font-semibold"
          >
            이어풀기
          </button>
          <button onClick={startFresh} className="rounded-md border border-hairline px-4 py-2 text-ink">
            새로 시작
          </button>
        </div>
      </div>
    )
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
              {q.stemImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={q.stemImage}
                  alt={`${q.number}번 문제 그림`}
                  className="mb-2 max-w-full rounded-md border border-hairline"
                />
              )}
              <div className="space-y-1">
                {q.choices.map((choice, i) => {
                  const choiceNum = (i + 1) as 1 | 2 | 3 | 4
                  const isSelected = selected[q.number] === choiceNum
                  const isCorrectChoice = choiceNum === q.answer
                  const choiceImage = q.choiceImages?.[i]
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
              {isAnswered && q.explanation && (
                <div className="mt-3 rounded-md border-l-4 border-blue-400 bg-blue-50 p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">해설</p>
                  <p className="text-sm text-ink">{q.explanation}</p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
