// app/[cert]/[round]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { roundExists } from '@/lib/getRounds'

export default function ModeSelectPage({
  params,
}: {
  params: { cert: string; round: string }
}) {
  const { cert, round } = params
  if (!roundExists(decodeURIComponent(cert), round)) notFound()

  const base = `/${cert}/${round}`
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-6">{decodeURIComponent(cert)} {round}</h1>
      <div className="space-y-3">
        <Link
          href={`${base}/exam`}
          className="block rounded-lg border-2 border-red-500 p-4 font-semibold text-red-600 hover:bg-red-50"
        >
          전체 모의고사 (실전 — 타이머, 일괄채점)
        </Link>
        <Link
          href={`${base}/practice`}
          className="block rounded-lg bg-surface-card p-4 text-ink hover:bg-gray-200"
        >
          과목별 연습 (즉시 정오 확인)
        </Link>
      </div>
    </main>
  )
}
