'use client';

import Link from 'next/link';

import { Button } from '@repo/ui';
import { Download } from 'lucide-react';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import type { ExportFormat } from '../model/types';

const OPTIONS: { format: ExportFormat; label: string; hint: string }[] = [
  { format: 'csv', label: 'CSV', hint: '엑셀·구글 시트, 다시 가져오기' },
  { format: 'md', label: 'Markdown', hint: '메모·문장까지, 노션에 붙이기' },
];

/**
 * 설정 화면의 "내 기록 내보내기" 섹션.
 *
 * 파일은 서버(GET /api/books/export)가 `Content-Disposition: attachment` 로 내려준다.
 * 그래서 버튼은 그냥 링크다 — fetch 로 받아 Blob 을 만들지 않는다.
 * (iOS 홈 화면 앱에서 Blob 다운로드가 새 창으로 열리거나 실패하는 문제를 피한다)
 *
 * 클라이언트 컴포넌트인 이유는 GA 이벤트(onClick) 하나뿐이다.
 */
export const ExportRecordsSection = () => (
  <section className='mt-6 rounded-2xl bg-sunken px-5 py-4'>
    <h2 className='text-sm font-medium text-text-strong'>내 기록 내보내기</h2>
    <p className='mt-1 text-sm text-text-subtle'>
      담은 책과 별점·한줄평·메모를 파일로 받아 둘 수 있어요. 비공개 책도 함께
      담겨요.
    </p>

    <ul className='mt-4 space-y-2'>
      {OPTIONS.map(({ format, label, hint }) => (
        <li key={format} className='flex items-center justify-between gap-4'>
          <span className='text-sm text-text-body'>
            {label}
            <span className='ml-2 text-xs text-text-subtle'>{hint}</span>
          </span>
          <Button asChild variant='outline' size='sm' className='gap-1.5'>
            {/* 파일 주소다 — next/link 는 화면 이동(클라이언트 라우팅)용이라 a 를 쓴다 */}
            <a
              href={`/api/books/export?format=${format}`}
              download
              onClick={() => trackEvent('records_export', { format })}
            >
              <Download aria-hidden className='size-4' />
              받기
            </a>
          </Button>
        </li>
      ))}
    </ul>

    {/* 약관 7조의 약속을 기능 옆에서 한 번 더 말한다 — 기록 서비스의 신뢰 장치 */}
    <p className='mt-4 text-xs text-text-subtle'>
      서비스를 닫게 되면 최소 30일 전에 알리고, 그동안 내보내기를 열어 둘게요.{' '}
      <Link href='/terms' className='underline underline-offset-2'>
        이용약관 7조
      </Link>
    </p>
  </section>
);
