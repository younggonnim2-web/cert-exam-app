// app/[cert]/[round]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { roundExists, safeDecodeSegment } from '@/lib/getRounds'

export default function ModeSelectPage({
  params,
}: {
  params: { cert: string; round: string }
}) {
  // params.cert/round는 이 실행 환경에서 실측 확인 결과 percent-encoding이 남은 원문
  // 그대로 전달된다 — 디코딩이 필요하다. safeDecodeSegment는 잘못된 encoding(리터럴
  // '%')에서 URIError로 500 크래시하는 대신 null을 반환해 notFound()로 처리하게 한다.
  const cert = safeDecodeSegment(params.cert)
  const round = safeDecodeSegment(params.round)
  if (cert === null || round === null || !roundExists(cert, round)) notFound()

  // 아래 하위 경로 링크는 반드시 encodeURIComponent를 거쳐야 한다 — cert/round에
  // '#', '?', '&', 공백 등 URL 예약 문자가 섞이면 인코딩 없이 그대로 문자열에 넣는
  // 순간 링크가 깨진다.
  const base = `/${encodeURIComponent(cert)}/${encodeURIComponent(round)}`
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-6">{cert} {round}</h1>
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
