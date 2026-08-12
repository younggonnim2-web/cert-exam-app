// app/page.tsx
import Link from 'next/link'
import { getCerts } from '@/lib/getRounds'

export default function HomePage() {
  const certs = getCerts()
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-6">자격증 선택</h1>
      {certs.length === 0 ? (
        <p className="text-gray-500 text-sm">
          등록된 자격증이 없습니다. data/exam-questions/ 를 확인해주세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {certs.map((cert) => (
            <li key={cert}>
              <Link
                href={`/${encodeURIComponent(cert)}`}
                className="block rounded-lg bg-surface-card p-4 text-ink hover:bg-gray-200"
              >
                {cert}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
