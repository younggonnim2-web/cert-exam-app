// components/ExamTimer.tsx
'use client'

import { useEffect, useState } from 'react'

export function ExamTimer({
  remainingSeconds,
  onExpire,
  onTick,
}: {
  remainingSeconds: number
  onExpire: () => void
  onTick: (remaining: number) => void
}) {
  const [remaining, setRemaining] = useState(remainingSeconds)
  const [tenseAnnounced, setTenseAnnounced] = useState(false)

  useEffect(() => {
    if (remaining <= 0) {
      onExpire()
      return
    }
    const timer = setTimeout(() => {
      const next = remaining - 1
      setRemaining(next)
      onTick(next)
    }, 1000)
    return () => clearTimeout(timer)
  }, [remaining, onExpire, onTick])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const isTense = remaining <= 600 // 잔여 10분 이하

  useEffect(() => {
    if (isTense) setTenseAnnounced(true)
  }, [isTense])

  return (
    <>
      {/* 매초 갱신되는 숫자는 aria-live를 달지 않는다 — 초 단위로 낭독되면 소음이 된다.
          잔여 10분 진입 "전환"만 한 번 별도 라이브 리전으로 알린다. */}
      <div
        aria-label={`남은 시간 ${minutes}분 ${seconds}초`}
        className={`text-2xl font-mono font-semibold px-4 py-2 rounded-md ${
          isTense ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-surface-soft text-ink'
        }`}
      >
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <span className="sr-only" aria-live="polite">
        {isTense && !tenseAnnounced ? '잔여 시간 10분 이하입니다' : ''}
      </span>
    </>
  )
}
