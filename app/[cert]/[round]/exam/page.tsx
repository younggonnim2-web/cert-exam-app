// app/[cert]/[round]/exam/page.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  // 않는다 (아래 effect가 맨 위에서 즉시 error 상태로 빠진다) — 빈 문자열은 타입을
  // 좁히기 위한 안전한 placeholder일 뿐이다.
  const cert = decodedCert ?? ''
  const round = decodedRound ?? ''

  const [status, setStatus] = useState<PageStatus>('loading')
  const [exam, setExam] = useState<FetchedExam | null>(null)
  const [answers, setAnswers] = useState<Record<number, 1 | 2 | 3 | 4>>({})
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [result, setResult] = useState<GradeResult | null>(null)
  // 재시도(다시 시도 버튼) 클릭 시 증가시켜 아래 fetch effect를 다시 돌리기 위한 토큰.
  // cert/round와 함께 effect의 의존성 배열에 들어간다 — 자동 로드(경로 변경)와 수동
  // 재시도를 같은 ignore-flag 보호 아래 하나의 effect로 처리한다 (아래 Step 참고).
  const [reloadToken, setReloadToken] = useState(0)

  // code-reviewer 지적 #1/#2 — ExamTimer에 넘기는 onExpire/onTick이 매 렌더마다 새
  // 함수 참조로 재생성되면, ExamTimer 내부 effect(deps: [remaining, onExpire, onTick])가
  // 답 선택/문항 이동 등 "타이머와 무관한" 부모 리렌더에도 매번 재실행되어, 이미 째깍이고
  // 있던 setTimeout이 매번 취소되고 처음부터(1000ms) 다시 시작한다 — 실제 경과 시간보다
  // 타이머가 훨씬 느리게 줄어드는 실질적 보너스 시간 버그다. finishExam/handleTick을
  // useCallback으로 감싸 참조를 안정시키고, 그 안에서 필요한 최신 상태는 매 렌더마다
  // 갱신되는 ref(latestRef)를 통해 읽는다 — 렌더 도중 ref를 직접 대입하는 것은
  // "최신값 보관용 ref" 패턴으로 흔히 쓰이는 방식이며, 여기서는 어떤 렌더링 출력에도
  // 영향을 주지 않는 순수 부기(bookkeeping)라서 안전하다.
  const latestRef = useRef({ cert, round, exam, answers })
  latestRef.current = { cert, round, exam, answers }

  // code-reviewer 지적 #2 — onExpire/onTick을 안정시켜도, 제출 확인창(window.confirm)이
  // 화면을 막고 있는 동안 뒤늦게 발화한 setTimeout 콜백은 confirm이 끝나고 finishExam이
  // 이미 clearAttempt를 호출한 "다음" 이벤트 루프 틱에 실행될 수 있다 — 그 콜백의
  // onTick이 방금 지운 답안을 saveAttempt로 되살려버린다. finishedRef는 finishExam이
  // 실행되는 바로 그 동기 구간에서 즉시 true로 세팅되므로, 뒤이어 실행되는 그 어떤
  // onTick 콜백도(이미 큐에 들어가 있었더라도) 첫 줄에서 바로 무시된다.
  const finishedRef = useRef(false)

  const finishExam = useCallback(() => {
    const { exam, answers, cert, round } = latestRef.current
    if (!exam || finishedRef.current) return
    finishedRef.current = true
    const graded = gradeAttempt(exam.questions, answers)
    setResult(graded)
    setStatus('result')
    saveResult(cert, round, 'exam', graded) // 결과는 다음 행동을 고를 때까지 남겨둔다
    clearAttempt(cert, round, 'exam') // 진행 중이던 답안/타이머는 더 이상 필요 없음
  }, [])

  const handleTick = useCallback((r: number) => {
    if (finishedRef.current) return
    setRemainingSeconds(r)
    const { cert, round, answers } = latestRef.current
    saveAttempt({ cert, round, mode: 'exam', answers, startedAt: Date.now(), remainingSeconds: r })
  }, [])

  // code-reviewer 지적 #3 — cert/round가 빠르게 바뀌는 경우(뒤로가기/앞으로가기 등)
  // 이전 라운드에 대한 fetch가 새 라운드 요청보다 늦게 응답하면, 화면은 이미 새
  // cert/round를 렌더링 중인데 오래된 응답이 상태를 덮어써 데이터가 뒤섞일 수 있다.
  // ignore 플래그로 "이 effect 실행이 그 사이 정리(cleanup)됐는지"를 표시해, 정리된
  // 이후 도착하는 응답은 어떤 setState도 건드리지 않도록 막는다. (code-reviewer 지적
  // #6도 같이 해결: named 함수를 effect 콜백으로 바로 넘기는 대신 관용적인 인라인
  // effect 형태로 바꿨다.)
  useEffect(() => {
    let ignore = false

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
        if (ignore) return
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
          finishedRef.current = false
          setRemainingSeconds(data.timeLimitMinutes * 60)
          setStatus('active')
        }
      })
      .catch(() => {
        if (!ignore) setStatus('error')
      })

    return () => {
      ignore = true
    }
  }, [cert, round, paramsInvalid, reloadToken])

  function retry() {
    setReloadToken((n) => n + 1)
  }

  function resumeSaved() {
    finishedRef.current = false
    const saved = loadAttempt(cert, round, 'exam')
    if (saved && exam) {
      setAnswers(saved.answers)
      setRemainingSeconds(saved.remainingSeconds ?? exam.timeLimitMinutes * 60)
    }
    setStatus('active')
  }

  function startFresh() {
    finishedRef.current = false
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

  function handleSubmitClick() {
    if (!exam) return
    const unanswered = exam.questions.length - Object.keys(answers).length
    const message =
      unanswered > 0
        ? `미응답 ${unanswered}문항이 있습니다. 제출하시겠습니까?`
        : '제출하시겠습니까?'
    if (window.confirm(message)) finishExam()
  }

  // code-reviewer 지적 #5 — finishExam으로 결과 화면에 진입해도 스크린리더 사용자에게는
  // 화면이 바뀌었다는 신호가 전혀 없었다. status가 'result'로 바뀌는 순간 결과 제목에
  // 포커스를 옮겨, 보조기술이 그 지점부터 다시 읽도록 한다.
  const resultHeadingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (status === 'result') {
      resultHeadingRef.current?.focus()
    }
  }, [status])

  if (status === 'loading') {
    return <main className="mx-auto max-w-2xl p-6">문제를 불러오는 중...</main>
  }

  if (status === 'error') {
    return (
      <main className="mx-auto max-w-2xl p-6 text-center">
        <p className="text-red-600 mb-4">문제를 불러오지 못했습니다.</p>
        <button onClick={retry} className="rounded-md border border-hairline px-4 py-2 text-ink">
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
        <h1 ref={resultHeadingRef} tabIndex={-1} className="text-2xl font-semibold mb-4 text-ink outline-none">
          결과
        </h1>
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
        <ExamTimer remainingSeconds={remainingSeconds} onExpire={finishExam} onTick={handleTick} />
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
