import Link from 'next/link';

const CARDS = [
  { href: '/admin/costs', title: 'AI 비용', desc: '이번 달 사용액과 예산 대비' },
  { href: '/admin/members', title: '회원 관리', desc: '가입자 조회·정지' },
];

export default function AdminHomePage() {
  return (
    <section className='grid gap-4 sm:grid-cols-2'>
      {CARDS.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className='rounded border border-line p-4 hover:bg-accent'
        >
          <div className='text-sm font-semibold'>{c.title}</div>
          <p className='mt-1 text-sm text-text-subtle'>{c.desc}</p>
        </Link>
      ))}
    </section>
  );
}
