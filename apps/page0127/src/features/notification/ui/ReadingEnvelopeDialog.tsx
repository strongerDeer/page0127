'use client';

import { useState } from 'react';

import {
  BookCover,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@repo/ui';
import { ArrowUpRight, MailOpen } from 'lucide-react';

import { BookEnvelopeArtwork } from '@/entities/notification/ui/BookEnvelopeArtwork';
import { toDisplayName } from '@/entities/profile/model/displayName';

import type { NotificationWithActor } from '@/entities/notification';

import styles from '@/entities/notification/ui/bookEnvelope.module.css';

export const ReadingEnvelopeDialog = ({
  notification,
  onClose,
  onRead,
  onVisit,
}: {
  notification: NotificationWithActor;
  onClose: () => void;
  onRead: () => Promise<unknown> | void;
  onVisit: (notification: NotificationWithActor) => Promise<unknown> | void;
}) => {
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const senderName = toDisplayName(notification.actor);
  const title = notification.target?.title;

  const openLetter = async () => {
    setBusy(true);
    setError(undefined);
    try {
      // 읽음 필터에서 목록이 사라져도 편지는 부모가 보관하므로 계속 읽을 수 있다.
      await onRead();
      setOpened(true);
    } catch {
      setError('봉투를 열지 못했어요. 다시 눌러 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const visit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      // 삭제·비공개 전환된 책 대신 보낸 사람 서재로 안내한다.
      await onVisit(
        title
          ? notification
          : { ...notification, target_id: null, target_type: null }
      );
    } catch {
      setError('이동하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className='max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl border-0 bg-[#f9f2e6] p-0 text-[#14294e] sm:max-w-[480px] [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:bg-[#fffaf0] [&_[data-slot=dialog-close]]:p-2'>
        <DialogTitle className='sr-only'>{senderName}님의 책 봉투</DialogTitle>
        <DialogDescription className='sr-only'>
          봉투를 열면 보낸 사람의 한마디와 첨부한 책을 확인할 수 있어요.
        </DialogDescription>
        <BookEnvelopeArtwork
          opened={opened}
          hasBook={Boolean(notification.target_id)}
          caption={`${senderName}님이 보낸 ${notification.target_id ? '책 봉투' : '한마디'}`}
        />
        {opened ? (
          <div className={`${styles.unfold} ${styles.letterSection}`}>
            <div className={styles.paper}>
              <div className={title ? styles.letterBody : undefined}>
                <div>
                  <p className='text-xs text-[#485771]'>도착한 한마디</p>
                  <blockquote className={styles.message}>
                    {notification.message || '같이 한 권 읽어요.'}
                  </blockquote>
                  {title && (
                    <section
                      className={styles.bookInfo}
                      aria-label='함께 보낸 책'
                    >
                      <p className={styles.bookTitle}>{title}</p>
                      {notification.target?.author && (
                        <p className={styles.author}>
                          {notification.target.author}
                        </p>
                      )}
                    </section>
                  )}
                  {!title && notification.target_id ? (
                    <p className='text-sm text-[#485771]'>
                      지금은 첨부한 책을 볼 수 없어요.
                    </p>
                  ) : null}
                  <p className={styles.signature}>— {senderName}</p>
                </div>
                {title && (
                  <div>
                    <div className={styles.cover}>
                      <BookCover
                        src={notification.target?.cover_image}
                        title={title}
                        author={notification.target?.author}
                        size='full'
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.letterActions}>
              <Button
                className='w-full rounded-full'
                onClick={() => void visit()}
                loading={busy}
              >
                {title ? '책 보러 가기' : '보낸 사람 서재 보기'}
                <ArrowUpRight size={16} aria-hidden='true' />
              </Button>
            </div>
          </div>
        ) : (
          <div className='px-6 pb-6'>
            <Button
              className='w-full rounded-full'
              onClick={() => void openLetter()}
              loading={busy}
            >
              <MailOpen size={16} aria-hidden='true' />
              봉투 열어보기
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
