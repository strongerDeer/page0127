'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@repo/ui';

import type { ReactNode } from 'react';

type Props = {
  open: boolean;
  title: string;
  description: ReactNode;
  actionLabel: string;
  destructive?: boolean;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export const BulkConfirmDialog = ({
  open,
  title,
  description,
  actionLabel,
  destructive = false,
  pending,
  error,
  onClose,
  onConfirm,
}: Props) => (
  <AlertDialog
    open={open}
    onOpenChange={(next) => {
      if (!next && !pending) onClose();
    }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      {error && (
        <p role='alert' className='text-sm text-text-body'>
          {error}
        </p>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
        <Button
          variant={destructive ? 'destructive' : 'default'}
          loading={pending}
          disabled={pending}
          onClick={onConfirm}
        >
          {actionLabel}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
