'use client';

import { useTransition } from 'react';

import { EyeOff, Undo2, X } from 'lucide-react';

import { RelativeTime } from '@/shared/ui/RelativeTime';

import { reportReasonLabel } from '@/entities/report/model/reasons';

import {
  hideComment,
  rejectReport,
  unhideComment,
} from '@/features/admin-reports/api/reportActions';

import type { ReportRow } from '@/features/admin-reports/api/getReports';

type ReportListProps = {
  reports: ReportRow[];
};

const STATUS_LABEL: Record<ReportRow['status'], string> = {
  pending: '미처리',
  resolved: '숨김 처리',
  rejected: '반려',
};

/**
 * 신고 목록.
 *
 * 판단에 필요한 것을 한 줄에 다 둔다 — 무슨 사유로, 누가, 무슨 글을 신고했는지.
 * 원문을 보러 다른 화면으로 넘어가야 하면 운영자는 처리를 미룬다.
 */
export const ReportList = ({ reports }: ReportListProps) => {
  const [isPending, startTransition] = useTransition();

  if (reports.length === 0) {
    return (
      <p className='rounded-lg border border-line p-6 text-center text-sm text-text-subtle'>
        접수된 신고가 없습니다.
      </p>
    );
  }

  return (
    <ul className='flex flex-col gap-3'>
      {reports.map((report) => (
        <li
          key={report.id}
          className='rounded-lg border border-line p-4 text-sm'
        >
          <div className='flex flex-wrap items-center gap-2'>
            <span className='rounded bg-sunken px-2 py-0.5 text-xs font-medium'>
              {reportReasonLabel(report.reason)}
            </span>
            <span className='text-xs text-text-subtle'>
              {STATUS_LABEL[report.status]}
            </span>
            {report.comment?.isHidden && (
              <span className='rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive'>
                숨김 상태
              </span>
            )}
            <RelativeTime
              date={report.createdAt}
              className='ml-auto text-xs text-text-subtle'
            />
          </div>

          {/* 신고된 원문 — 판단의 근거다 */}
          <blockquote className='mt-3 border-l-2 border-line-soft pl-3 text-text-body'>
            {report.comment?.content ?? '(댓글이 삭제되었습니다)'}
          </blockquote>

          <p className='mt-2 text-xs text-text-subtle'>
            작성자 {report.comment?.authorName ?? '알 수 없음'} · 신고자{' '}
            {report.reporterName ?? '탈퇴한 사용자'}
          </p>

          {report.detail && (
            <p className='mt-2 rounded bg-sunken p-2 text-xs text-text-body'>
              {report.detail}
            </p>
          )}

          {report.comment && (
            <div className='mt-3 flex flex-wrap gap-2'>
              {report.comment.isHidden ? (
                <button
                  type='button'
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() =>
                      unhideComment(report.id, report.comment!.id)
                    )
                  }
                  className='inline-flex items-center gap-1.5 rounded border border-line px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50'
                >
                  <Undo2 aria-hidden className='size-3.5' />
                  숨김 해제
                </button>
              ) : (
                <button
                  type='button'
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() =>
                      hideComment(report.id, report.comment!.id)
                    )
                  }
                  className='inline-flex items-center gap-1.5 rounded border border-line px-3 py-1.5 text-xs text-destructive hover:bg-accent disabled:opacity-50'
                >
                  <EyeOff aria-hidden className='size-3.5' />
                  댓글 숨기기
                </button>
              )}

              {report.status === 'pending' && (
                <button
                  type='button'
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => rejectReport(report.id))
                  }
                  className='inline-flex items-center gap-1.5 rounded border border-line px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50'
                >
                  <X aria-hidden className='size-3.5' />
                  문제없음
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};
