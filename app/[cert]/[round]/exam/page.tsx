// app/[cert]/[round]/exam/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { OmrGrid } from '@/components/OmrGrid'
import { QuestionDetail } from '@/components/QuestionDetail'
import { ExamTimer } from '@/components/ExamTimer'
import { loadAttempt, saveAttempt, clearAttempt, saveResult, loadResult, clearResult } from '@/lib/examStorage'
import { gradeAttempt, type GradeResult } from '@/lib/grading'
// lib/getRounds.ts도 safeDecodeSegment를 재수출하지만, 그 파일은 최상단에서
// node:fs를 import하기 때문에 이 클라이언트 컴포넌트에서 거기서 가져오면 webpack이
// node:fs까지 브라우저 번들에 포함시키려다 빌드가 깨진다(dev server에서 실측 확인:
// `UnhandledSchemeError: Reading from "node:fs" is not handled by plugins`).
// fs 의존성이 없는 순수 모듈에서 직접 가져온다.
import { safeDecodeSegment } from '@/lib/safeDecodeSegment'
import type { Question } from '@/lib/types'

type FetchedExam = { questions: Question[]; timeLimitMinutes: number; passingScore: number }
type PageStatus = 'loading' | 'error' | 'resume-prompt' | 'active' | 'result'

export default function ExamPage() {
  // useParams()도 (서버 컴포넌트의 params prop과 마찬가지로) percent-encoding이 남은
  // 원문 그대로 값을 돌려준다 — 실제 dev 서버(Next.js 14.2.35)에 대해 useParams() 호출
  // 결과를 직접 로그로 찍어 확인했다: 한글 cert 세그먼트가 '%EC%9C...' 형태로 도착한다.
  // 서버 컴포넌트(app/[cert]/[round]/page.tsx, practice/page.tsx)와 동일하게
  // safeDecodeSegment로 디코딩해야 하고, 잘못된 encoding이면 크래시 대신 에러 상태로
  // 전환한다. safeDecodeSegment 자체는 훅이 아니므로 아래 훅 호출들보다 먼저 계산해도
  // Rules of Hooks를 어기지 않는다.
  const rawParams = useParams<{ cert: string; round: string }>()
  const decodedCert = safeDecodeSegment(rawParams.cert)
  const decodedRound = safeDecodeSegment(rawParams.round)
  const paramsInvalid = decodedCert === null || decodedRound === null
  // 아래 실제 로직에서 쓰는 cert/round는 paramsInvalid가 true인 동안은 절대 참조되지
  // 않는다 (load()가 맨 위에서 즉시 error 상태로 빠진다) — 빈 문자열은 타입을 좁히기
  // 위한 안전한 placeholder일 뿐이다.
  const cert = decodedCert ?? ''
  const round = decodedRound ?? ''

  const [status, setStatus] = useState<PageStatus>('loading')
  const [exam, setExam] = useState<FetchedExam | null>(null)
  const [answers, setAnswers] = useState<Record<number, 1 | 2 | 3 | 4>>({})
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [result, setResult] = useState<GradeResult | null>(null)

  function load() {
    if (paramsInvalid) {
      setStatus('error')
      return
    }
    setStatus('loading')
    fetch(`/api/questions?cert=${encodeURIComponent(cert)}&round=${encodeURIComponent(round)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<FetchedExam>
      })
      .then((data) => {
        setExam(data)

        // 이미 채점된 결과가 있으면 (제출 직후 새로고침 등) 그 결과를 그대로 복원한다 —
        // plan-eng-review에서 지적된 버그: 예전엔 finishExam이 clearAttempt만 부르고
        // 결과 자체는 어디에도 저장하지 않아서, 결과 화면 직후 새로고침하면 60문항을
        // 처음부터 다시 풀어야 했다.
        const savedResult = loadResult(cert, round, 'exam')
        if (savedResult) {
          setResult(savedResult)
          setStatus('result')
          return
        }

        const saved = loadAttempt(cert, round, 'exam')
        if (saved && Object.keys(saved.answers).length > 0) {
          // 방치된 시험 재진입 — 조용히 덮어쓰지 않고 사용자에게 묻는다 (High #5)
          setStatus('resume-prompt')
        } else {
          setRemainingSeconds(data.timeLimitMinutes * 60)
          setStatus('active')
        }
      })
      .catch(() => setStatus('error'))
  }

  useEffect(load, [cert, round, paramsInvalid])

  function resumeSaved() {
    const saved = loadAttempt(cert, round, 'exam')
    if (saved && exam) {
      setAnswers(saved.answers)
      setRemainingSeconds(saved.remainingSeconds ?? exam.timeLimitMinutes * 60)
    }
    setStatus('active')
  }

  function startFresh() {
    clearAttempt(cert, round, 'exam')
    clearResult(cert, round, 'exam')
    setResult(null)
    setAnswers({})
    setCurrentQuestionNumber(1)
    if (exam) setRemainingSeconds(exam.timeLimitMinutes * 60)
    setStatus('active')
  }

  function leaveResult() {
    // 결과를 보고 다른 화면(과목별연습/회차선택)으로 이동할 때는 결과를 지운다 —
    // "다시 풀기"가 아니라 결과 확인이 끝났다는 사용자의 명시적 신호이므로.
    clearResult(cert, round, 'exam')
  }

  function handleSelect(choice: 1 | 2 | 3 | 4) {
    const next = { ...answers, [currentQuestionNumber]: choice }
    setAnswers(next)
    saveAttempt({
      cert,
      round,
      mode: 'exam',
      answers: next,
      startedAt: Date.now(),
      remainingSeconds,
    })
  }

  function finishExam() {
    if (!exam) return
    const graded = gradeAttempt(exam.questions, answers)
    setResult(graded)
    setStatus('result')
    saveResult(cert, round, 'exam', graded) // 결과는 다음 행동을 고를 때까지 남겨둔다
    clearAttempt(cert, round, 'exam') // 진행 중이던 답안/타이머는 더 이상 필요 없음
  }

  function handleSubmitClick() {
    if (!exam) return
    const unanswered = exam.questions.length - Object.keys(answers).length
    const message =
      unanswered > 0
        ? `미응답 ${unanswered}문항이 있습니다. 제출하시겠습니까?`
        : '제출하시겠습니까?'
    if (window.confirm(message)) finishExam()
  }

  if (status === 'loading') {
    return <main className="mx-auto max-w-2xl p-6">문제를 불러오는 중...</main>
  }

  if (status === 'error') {
    return (
      <main className="mx-auto max-w-2xl p-6 text-center">
        <p className="text-red-600 mb-4">문제를 불러오지 못했습니다.</p>
        <button onClick={load} className="rounded-md border border-hairline px-4 py-2 text-ink">
          다시 시도
        </button>
      </main>
    )
  }

  if (status === 'resume-prompt') {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <p className="mb-4 text-ink">이전에 시작한 시험이 있습니다.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={resumeSaved} className="rounded-md bg-blue-500 text-white px-4 py-2 font-semibold">
            이어풀기
          </button>
          <button onClick={startFresh} className="rounded-md border border-hairline px-4 py-2 text-ink">
            새로 시작
          </button>
        </div>
      </main>
    )
  }

  if (status === 'result' && result && exam) {
    const passed = result.scorePercent >= exam.passingScore
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-2xl font-semibold mb-4 text-ink">결과</h1>
        <div
          className={`rounded-xl p-6 text-center mb-4 shadow-sm ${
            passed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}
        >
          <p className="text-3xl font-semibold mb-1">{passed ? '합격' : '불합격'}</p>
          <p className="text-lg">
            {result.correctCount} / {result.totalCount} 정답 ({result.scorePercent}점 · 합격선{' '}
            {exam.passingScore}점)
          </p>
        </div>
        <p className="text-sm text-muted mb-6">
          오답 문항: {result.wrongQuestionNumbers.join(', ') || '없음'}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={startFresh}
            className="rounded-md bg-blue-500 text-white py-3 font-semibold"
          >
            다시 풀기
          </button>
          <Link
            href={`/${encodeURIComponent(cert)}/${encodeURIComponent(round)}/practice`}
            onClick={leaveResult}
            className="rounded-md border border-hairline py-3 text-center text-ink"
          >
            과목별 연습으로
          </Link>
          <Link
            href={`/${encodeURIComponent(cert)}`}
            onClick={leaveResult}
            className="rounded-md border border-hairline py-3 text-center text-ink"
          >
            회차 선택으로
          </Link>
        </div>
      </main>
    )
  }

  if (!exam) return null // active 상태인데 exam이 없는 경우는 발생하지 않지만 타입 좁히기용
  const currentQuestion = exam.questions.find((q) => q.number === currentQuestionNumber)
  if (!currentQuestion) return null

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-ink">전체 모의고사</h1>
        <ExamTimer
          remainingSeconds={remainingSeconds}
          onExpire={finishExam}
          onTick={(r) => {
            setRemainingSeconds(r)
            saveAttempt({ cert, round, mode: 'exam', answers, startedAt: Date.now(), remainingSeconds: r })
          }}
        />
      </div>

      {/* 상세 패널 — 현재 문항의 지문/보기, 여기서 답을 선택 */}
      <QuestionDetail
        question={currentQuestion}
        selected={answers[currentQuestionNumber]}
        onSelect={handleSelect}
      />

      <div className="flex justify-between mt-4">
        <button
          onClick={() => setCurrentQuestionNumber((n) => Math.max(1, n - 1))}
          disabled={currentQuestionNumber === 1}
          className="rounded-md border border-hairline px-4 py-2 text-ink disabled:opacity-40"
        >
          이전
        </button>
        <button
          onClick={() => setCurrentQuestionNumber((n) => Math.min(exam.questions.length, n + 1))}
          disabled={currentQuestionNumber === exam.questions.length}
          className="rounded-md border border-hairline px-4 py-2 text-ink disabled:opacity-40"
        >
          다음
        </button>
      </div>

      {/* OMR 요약 — 문항 번호 탭하면 상세 패널이 그 문항으로 이동 */}
      <div className="mt-6">
        <OmrGrid
          questions={exam.questions}
          answers={answers}
          currentQuestionNumber={currentQuestionNumber}
          onNavigate={setCurrentQuestionNumber}
        />
      </div>

      <button
        onClick={handleSubmitClick}
        className="mt-6 w-full rounded-md bg-red-500 text-white py-3 font-semibold"
      >
        제출하고 채점하기
      </button>
    </main>
  )
}
