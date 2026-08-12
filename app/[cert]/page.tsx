// app/[cert]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { certExists, getRounds } from '@/lib/getRounds'

export default function RoundListPage({ params }: { params: { cert: string } }) {
  const cert = decodeURIComponent(params.cert)
  if (!certExists(cert)) notFound()

  const rounds = getRounds(cert)
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-6">{cert} — 회차 선택</h1>
      {rounds.length === 0 ? (
        <p className="text-gray-500 text-sm">
          아직 파싱된 회차가 없습니다. questions.json 생성이 필요합니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {rounds.map((r) => (
            <li key={r.date}>
              <Link
                href={`/${encodeURIComponent(cert)}/${r.date}`}
                className="block rounded-lg bg-surface-card p-4 text-ink hover:bg-gray-200"
              >
                {r.date} 시행
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
