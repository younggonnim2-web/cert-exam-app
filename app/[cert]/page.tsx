// app/[cert]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { certExists, getRounds, safeDecodeSegment } from '@/lib/getRounds'

export default function RoundListPage({ params }: { params: { cert: string } }) {
  // params.cert는 이 실행 환경에서 실측 확인 결과 percent-encoding이 남은 원문 그대로
  // 전달된다 — 디코딩이 필요하다. safeDecodeSegment는 잘못된 encoding(리터럴 '%')에서
  // URIError로 500 크래시하는 대신 null을 반환해 notFound()로 깔끔히 처리하게 한다.
  const cert = safeDecodeSegment(params.cert)
  if (cert === null || !certExists(cert)) notFound()

  const rounds = getRounds(cert)
  return (
    <main className="mx-auto max-w-md p-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted">
        ← 뒤로
      </Link>
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
                href={`/${encodeURIComponent(cert)}/${encodeURIComponent(r.date)}`}
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
