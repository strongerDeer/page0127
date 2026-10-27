'use client';
import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
} from '@repo/ui';
import { MailOpen } from 'lucide-react';

import { getSeoulToday } from '@/entities/book/model/libraryPeriod';
import { CompleteReadingForm } from '@/entities/book/ui/CompleteReadingForm';
import { BookEnvelopeArtwork } from '@/entities/notification/ui/BookEnvelopeArtwork';
import { ReadingMessagePaper } from '@/entities/notification/ui/ReadingMessagePaper';
import { toDisplayName } from '@/entities/profile/model/displayName';

import type { NotificationWithActor } from '@/entities/notification';
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
    if (!onRespond) return;
    void run(async () => {
      const reply = await onRespond(input);
      setResult(reply);
      setMode('letter');
    }, '저장하지 못했어요. 다시 시도해 주세요.');
  };
  const alreadyAccepted =
    result?.accepted_at ?? notification.envelope?.accepted_at;
  const alreadySaved = result?.saved_at ?? notification.envelope?.saved_at;
  const actionable = Boolean(onRespond && notification.envelope && book);
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value && !busy) onClose();
      }}
    >
      <DialogContent className='max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl border-0 bg-[#f9f2e6] p-0 text-[#14294e] sm:max-w-[480px] [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:bg-[#fffaf0] [&_[data-slot=dialog-close]]:p-2'>
        <DialogTitle className='sr-only'>
          {senderName}님의{' '}
          {kind === 'note'
            ? '한마디'
            : kind === 'invitation'
              ? '같이 읽기 초대'
              : '책 추천'}
        </DialogTitle>
        <DialogDescription className='sr-only'>
          보낸 사람의 메시지와 책을 확인하고 내 서재에 담을 수 있어요.
        </DialogDescription>
        {kind !== 'note' && (
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
                />
                {!book && notification.target_id && (
                  <p className='mt-4 text-sm'>
                    지금은 첨부한 책을 볼 수 없어요.
                  </p>
                )}
                <div className={`${styles.letterActions} space-y-2`}>
                  {result && (
                    <p role='status' className='py-2 text-center text-sm'>
                      {result.status === 'completed'
                        ? '내 서재의 완독 기록으로 남아 있어요.'
                        : result.status === 'reading'
                          ? '내 서재에서 함께 읽고 있어요.'
                          : '읽고 싶어요에 담았어요.'}
                    </p>
                  )}
                  {actionable && (
                    <>
                      {kind === 'invitation' && (
                        <Button
                          className='w-full rounded-full'
                          disabled={
                            busy ||
                            Boolean(alreadyAccepted) ||
                            result?.status === 'completed'
                          }
                          onClick={() => {
                            setError(undefined);
                            setMode('start');
                          }}
                        >
                          {alreadyAccepted
                            ? '함께 읽는 중'
                            : result?.status === 'completed'
                              ? '이미 완독한 책이에요'
                              : '같이 읽기 수락'}
                        </Button>
                      )}
                      {!alreadyAccepted && (
                        <Button
                          className='w-full rounded-full'
                          variant={
                            kind === 'recommendation' ? 'default' : 'outline'
                          }
                          disabled={busy || Boolean(alreadySaved)}
                          onClick={() =>
                            respond({ action: 'save', isPublic: true })
                          }
                        >
                          {alreadySaved
                            ? '내 서재에 있어요'
                            : '읽고 싶어요에 담기'}
                        </Button>
                      )}
                      <Button
                        className='w-full rounded-full'
                        variant='ghost'
                        disabled={busy}
                        onClick={() => {
                          setError(undefined);
                          setMode('complete');
                        }}
                      >
                        이미 읽었어요
                      </Button>
                    </>
                  )}
                  <Button
                    className='w-full rounded-full'
                    variant={actionable ? 'outline' : 'default'}
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () =>
                          onVisit(
                            book
                              ? notification
                              : {
                                  ...notification,
                                  target_id: null,
                                  target_type: null,
                                }
                          ),
                        '이동하지 못했어요.'
                      )
                    }
                  >
                    {book ? '책 보러 가기 ↗' : '보낸 사람 서재 보기 ↗'}
                  </Button>
                </div>
              </>
            ) : mode === 'complete' ? (
              <div className='rounded-2xl bg-white p-5'>
                <h3 className='mb-5 font-semibold'>
                  내 완독 기록 · {book?.title}
                </h3>
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
                className='space-y-5 rounded-2xl bg-white p-5'
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!busy && startDate && startDate <= getSeoulToday())
                    respond({ action: 'accept', isPublic, startDate });
                }}
              >
                <h3 className='font-semibold'>같이 읽기 · {book?.title}</h3>
                <label className='block text-sm'>
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
                <Button type='submit' className='w-full' loading={busy}>
                  읽는 중으로 등록
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  className='w-full'
                  disabled={busy}
                  onClick={() => {
                    setMode('letter');
                    setError(undefined);
                  }}
                >
                  취소
                </Button>
              </form>
            )}
          </div>
        ) : (
          <div className={kind === 'note' ? 'px-5 py-8' : 'px-6 pb-6'}>
            {kind === 'note' && (
              <ReadingMessagePaper
                kind='note'
                senderName={senderName}
                message='쪽지 한 장이 도착했어요.'
              />
            )}
            <Button
              className='mt-4 w-full rounded-full'
              loading={busy}
              onClick={() =>
                void run(async () => {
                  await onRead();
                  setOpened(true);
                }, '메시지를 열지 못했어요.')
              }
            >
              <MailOpen size={16} />
              {kind === 'note' ? '쪽지 읽기' : '봉투 열어보기'}
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
