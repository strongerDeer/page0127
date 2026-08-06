'use client';

import { useId, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@repo/ui';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';

import {
  REASON_REQUIRING_DETAIL,
  REPORT_DETAIL_MAX_LENGTH,
  REPORT_REASONS,
  type ReportReason,
} from '@/entities/report/model/reasons';

type ReportCommentDialogProps = {
  commentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * 댓글 신고 다이얼로그.
 *
 * 신고는 남을 불이익에 놓는 행위라 한 번 더 묻는 화면을 둔다 — 메뉴에서 바로
 * 접수되면 오조작이 그대로 신고가 된다.
 *
 * 접수 뒤 결과를 알려주지 않는다. 처리 결과를 신고자에게 보내면 "누가 신고했는지"가
 * 역추적되는 통로가 된다. 대신 접수됐다는 사실만 분명히 말한다.
 */
export const ReportCommentDialog = ({
  commentId,
  open,
  onOpenChange,
}: ReportCommentDialogProps) => {
  const fieldId = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');

  const needsDetail = reason === REASON_REQUIRING_DETAIL;
  const canSubmit = reason !== null && (!needsDetail || detail.trim().length > 0);

  const reportMutation = useMutation({
    mutationFn: async () =>
      apiClient.post('/reports', { commentId, reason, detail: detail.trim() }),
    onSuccess: (response) => {
      // 이미 신고한 건도 성공으로 받는다 — 사용자에겐 접수된 상태 그대로다
      const alreadyReported = Boolean(
        (response.data as { alreadyReported?: boolean } | undefined)
          ?.alreadyReported
      );
      toast.success(
        alreadyReported
          ? '이미 신고한 댓글이에요.'
          : '신고를 접수했어요. 확인 후 조치할게요.'
      );
      close();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, '신고에 실패했습니다.'));
    },
  });

  const close = () => {
    onOpenChange(false);
    // 다음에 열 때 앞선 선택이 남아 있으면 잘못 접수된다
    setReason(null);
    setDetail('');
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>댓글 신고</DialogTitle>
          <DialogDescription>
            어떤 점이 문제인지 알려 주세요. 운영자가 확인한 뒤 조치합니다.
          </DialogDescription>
        </DialogHeader>

        <fieldset className='space-y-2'>
          <legend className='mb-2 text-sm font-medium'>신고 사유</legend>
          {REPORT_REASONS.map((option) => (
            <label
              key={option.value}
              className='flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-accent'
            >
              <input
                type='radio'
                name='reason'
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
                className='size-4 accent-primary'
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <div className='space-y-2'>
          <Label htmlFor={fieldId}>
            설명 {needsDetail ? '(필수)' : '(선택)'}
          </Label>
          <Textarea
            id={fieldId}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={REPORT_DETAIL_MAX_LENGTH}
            rows={3}
            placeholder='자세히 적어 주시면 더 빨리 확인할 수 있어요.'
            className='resize-none'
          />
          <p className='text-xs text-text-subtle'>
            {detail.length}/{REPORT_DETAIL_MAX_LENGTH}자
          </p>
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={close}>
            취소
          </Button>
          <Button
            type='button'
            onClick={() => reportMutation.mutate()}
            disabled={!canSubmit || reportMutation.isPending}
          >
            {reportMutation.isPending ? '접수 중…' : '신고하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
