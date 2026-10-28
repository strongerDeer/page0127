'use client';
import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from '@repo/ui';
import { MailOpen, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { getSeoulToday } from '@/entities/book/model/libraryPeriod';
import { CompleteReadingForm } from '@/entities/book/ui/CompleteReadingForm';
import {
  notificationHref,
  type NotificationWithActor,
} from '@/entities/notification';
import { BookEnvelopeArtwork } from '@/entities/notification/ui/BookEnvelopeArtwork';
import { ReadingMessagePaper } from '@/entities/notification/ui/ReadingMessagePaper';
import { toDisplayName } from '@/entities/profile/model/displayName';

import type {
  EnvelopeReply,
  ReadingEnvelopeResponse,
} from '@/entities/notification/model/readingNudge';

import styles from '@/entities/notification/ui/bookEnvelope.module.css';

export type ReadingEnvelopeDialogProps = {
  notification: NotificationWithActor;
  onClose: () => void;
  onRead: () => Promise<unknown> | void;
  onVisit: (notification: NotificationWithActor) => Promise<unknown> | void;
  onRespond?: (input: EnvelopeReply) => Promise<ReadingEnvelopeResponse>;
};
export const ReadingEnvelopeDialog = ({
  notification,
  onClose,
  onRead,
  onVisit,
  onRespond,
}: ReadingEnvelopeDialogProps) => {
  const kind = notification.envelope?.kind ?? 'recommendation';
  const [opened, setOpened] = useState(false);
  const [mode, setMode] = useState<'letter' | 'start' | 'complete'>('letter');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ReadingEnvelopeResponse>();
  const [startDate, setStartDate] = useState(getSeoulToday());
  const [isPublic, setIsPublic] = useState(true);
  const senderName = toDisplayName(notification.actor);
  const book = notification.target?.title
    ? { ...notification.target, title: notification.target.title }
    : null;
  const run = async (
    action: () => Promise<unknown> | void,
    failure: string
  ) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : failure);
    } finally {
      setBusy(false);
    }
  };
  const respond = (input: EnvelopeReply) => {
    if (!onRespond || busy) return;
    void run(async () => {
      const reply = await onRespond(input);
      setResult(reply);
      setMode('letter');
      toast.success(
        reply.outcome === 'existing'
          ? '이미 내 서재에 있어요. 기존 기록을 유지했어요.'
          : input.action === 'save'
            ? '읽고 싶어요에 담았어요.'
            : input.action === 'accept'
              ? '함께 읽기를 시작했어요.'
              : '완독 기록을 저장했어요.'
      );
    }, '저장하지 못했어요. 다시 시도해 주세요.');
  };
  const accepted = result?.accepted_at ?? notification.envelope?.accepted_at;
  const saved = result?.saved_at ?? notification.envelope?.saved_at;
  const actionable = Boolean(onRespond && notification.envelope && book);
  const showForm = (next: 'start' | 'complete') => {
    setError(undefined);
    setMode(next);
  };
  const visit = () =>
    void run(
      () =>
        onVisit(
          book
            ? notification
            : { ...notification, target_id: null, target_type: null }
        ),
      '이동하지 못했어요.'
    );
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value && !busy) onClose();
      }}
    >
      <DialogContent
        className={`max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto border-0 p-0 sm:max-w-[480px] [&_[data-slot=dialog-close]]:bg-background/90 [&_[data-slot=dialog-close]]:p-1.5 ${kind === 'note' ? styles.noteCanvas : mode === 'letter' ? styles.letterCanvas : ''}`}
      >
        <DialogTitle className='sr-only'>
          {senderName}님의{' '}
          {kind === 'note'
            ? '한마디'
            : kind === 'invitation'
              ? '같이 읽기 초대'
              : '책 추천'}
        </DialogTitle>
        <DialogDescription className='sr-only'>
          보낸 사람의 한마디와 책을 확인하고 내 서재에 담을 수 있어요.
        </DialogDescription>
        {kind !== 'note' && mode === 'letter' && (
          <BookEnvelopeArtwork
            kind={kind}
            opened={opened}
            hasBook={Boolean(notification.target_id)}
            caption={`${senderName}님이 보냈습니다.`}
          />
        )}
        {opened ? (
          <div className={`${styles.unfold} ${styles.letterSection}`}>
            {mode === 'letter' ? (
              <>
                <ReadingMessagePaper
                  kind={kind}
                  senderName={senderName}
                  message={notification.message || '같이 한 권 읽어요.'}
                  book={book}
                  bookHref={
                    book
                      ? notificationHref(
                          notification,
                          notification.actor.username
                        )
                      : null
                  }
                  onBookOpen={visit}
                />
                {!book && notification.target_id && (
                  <p className='mt-4 text-sm text-text-subtle'>
                    지금은 첨부한 책을 볼 수 없어요.
                  </p>
                )}
                <div
                  className={`${styles.letterActions} flex items-center gap-2`}
                >
                  {actionable && (
                    <>
                      {kind === 'invitation' ? (
                        <Button
                          className='flex-1'
                          disabled={
                            busy ||
                            Boolean(accepted) ||
                            result?.status === 'completed'
                          }
                          onClick={() => showForm('start')}
                        >
                          {accepted
                            ? '함께 읽는 중'
                            : result?.status === 'completed'
                              ? '이미 완독한 책이에요'
                              : '같이 읽기 수락'}
                        </Button>
                      ) : (
                        <Button
                          className='flex-1'
                          disabled={busy || Boolean(saved)}
                          onClick={() =>
                            respond({ action: 'save', isPublic: true })
                          }
                        >
                          {saved ? '내 서재에 있어요' : '읽고 싶어요에 담기'}
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='outline'
                            size='icon-md'
                            aria-label='다른 상태로 담기'
                            title='다른 상태로 담기'
                            disabled={busy}
                          >
                            <MoreHorizontal size={18} aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          {kind === 'invitation' && !saved && (
                            <DropdownMenuItem
                              onSelect={() =>
                                respond({ action: 'save', isPublic: true })
                              }
                            >
                              읽고 싶어요에 담기
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={() => showForm('complete')}
                          >
                            이미 읽었어요
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                  {!book && (
                    <Button
                      variant='link'
                      className='ml-auto'
                      disabled={busy}
                      onClick={visit}
                    >
                      보낸 사람 서재 보기 ↗
                    </Button>
                  )}
                </div>
              </>
            ) : mode === 'complete' ? (
              <div className='py-5'>
                <h3 className='mb-1 font-semibold'>내 완독 기록</h3>
                <p className='mb-5 text-sm text-text-subtle'>{book?.title}</p>
                <CompleteReadingForm
                  busy={busy}
                  onCancel={() => {
                    setMode('letter');
                    setError(undefined);
                  }}
                  onSubmit={(value) =>
                    respond({ action: 'complete', ...value })
                  }
                />
              </div>
            ) : (
              <form
                className='space-y-5 py-5'
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!busy && startDate && startDate <= getSeoulToday())
                    respond({ action: 'accept', isPublic, startDate });
                }}
              >
                <div>
                  <h3 className='font-semibold'>같이 읽기</h3>
                  <p className='mt-1 text-sm text-text-subtle'>{book?.title}</p>
                </div>
                <label className='block text-sm font-medium'>
                  읽기 시작한 날
                  <Input
                    type='date'
                    className='mt-2'
                    required
                    max={getSeoulToday()}
                    value={startDate}
                    disabled={busy}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </label>
                <label className='flex items-center gap-2 text-sm'>
                  <input
                    type='checkbox'
                    className='size-4 accent-primary'
                    checked={isPublic}
                    disabled={busy}
                    onChange={(event) => setIsPublic(event.target.checked)}
                  />
                  공개 기록으로 남기기
                </label>
                <p className='text-xs leading-relaxed text-text-subtle'>
                  이미 내 서재에 있으면 기존 기록을 이어가요. 완독한 책은 그대로
                  유지해요.
                </p>
                <div className='flex justify-end gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={busy}
                    onClick={() => {
                      setMode('letter');
                      setError(undefined);
                    }}
                  >
                    취소
                  </Button>
                  <Button type='submit' loading={busy}>
                    읽는 중으로 등록
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className={kind === 'note' ? styles.noteSheet : 'px-6 pb-6'}>
            {kind === 'note' && (
              <ReadingMessagePaper
                kind='note'
                senderName={senderName}
                message={notification.message || '보낸 내용이 없어요.'}
              />
            )}
            <Button
              className={
                kind === 'note' ? 'ml-auto mt-6 flex min-w-20' : 'mt-4 w-full'
              }
              loading={busy}
              onClick={() =>
                void run(async () => {
                  await onRead();
                  if (kind === 'note') onClose();
                  else setOpened(true);
                }, '메시지를 열지 못했어요.')
              }
            >
              {kind !== 'note' && <MailOpen size={16} />}
              {kind === 'note' ? '확인' : '봉투 열어보기'}
            </Button>
          </div>
        )}
        {error && (
          <p role='alert' className='px-6 pb-5 text-sm'>
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
