'use client';

import { useMemo, useState, useTransition } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  BookCover,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@repo/ui';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  createSentence,
  deleteSentence,
  toggleSentenceActive,
  updateSentence,
} from '../api/sentenceActions';
import { SentenceFields } from './SentenceFields';

import type { AdminSentence } from '../api/getAdminSentences';
import type { SentenceActionResult } from '../api/sentenceActions';

type AdminSentenceManagerProps = {
  /** null = 조회 실패 */
  sentences: AdminSentence[] | null;
};

/** 다이얼로그가 무엇을 하는 중인가 — 닫힘 / 새로 추가 / 이 문장 수정 */
type Editing = null | 'new' | AdminSentence;

/**
 * 오늘의 문장 풀 관리 — 목록 + 추가·수정 팝업 (HJ, 2026-11-10).
 *
 * 예전엔 문장마다 수정 폼을 목록 안에 펼쳐서, 문장이 늘면 화면이 끝없이 길어지고
 * 저장됐는지도 알 수 없었다. 지금은 한 줄 목록에서 "수정"을 누르면 팝업이 뜨고,
 * 저장하면 팝업이 닫히며 토스트로 알려 준다. 목록은 server action 의 revalidatePath 로 갱신된다.
 *
 * 활성 문장이 하나라도 있으면 사용자 서재에 "오늘의 문장" 카드가 나타난다.
 * 뽑힌 적 있는 문장은 지우지 못하고 비활성만 된다(사용자 캘린더 기록 보호).
 */
export const AdminSentenceManager = ({
  sentences,
}: AdminSentenceManagerProps) => {
  const [editing, setEditing] = useState<Editing>(null);
  const [query, setQuery] = useState('');

  const activeCount = sentences?.filter((s) => s.is_active).length ?? 0;

  // 문장·책 제목·저자로 거른다 — 풀이 커져도 고칠 문장을 바로 찾게
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!sentences || !q) return sentences;
    return sentences.filter((s) =>
      [s.text, s.book_title, s.author ?? '', s.translator ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [sentences, query]);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          type='search'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='문장·책·저자로 찾기'
          aria-label='문장 찾기'
          className='h-9 max-w-xs'
        />
        <span className='text-xs text-text-subtle'>
          활성 {activeCount}개 · 전체 {sentences?.length ?? 0}개
          {activeCount === 0 &&
            ' — 활성 문장이 없으면 사용자 서재에 카드가 나오지 않아요.'}
        </span>
        <Button size='sm' className='ml-auto' onClick={() => setEditing('new')}>
          <Plus aria-hidden />
          문장 추가
        </Button>
      </div>

      {sentences === null ? (
        <p className='text-sm text-text-subtle'>목록을 불러오지 못했습니다.</p>
      ) : sentences.length === 0 ? (
        <p className='text-sm text-text-subtle'>아직 문장이 없어요.</p>
      ) : visible?.length === 0 ? (
        <p className='text-sm text-text-subtle'>찾는 문장이 없어요.</p>
      ) : (
        <ul className='divide-y divide-line rounded-lg border border-line'>
          {visible?.map((sentence) => (
            <SentenceRow
              key={sentence.id}
              sentence={sentence}
              onEdit={() => setEditing(sentence)}
            />
          ))}
        </ul>
      )}

      <SentenceDialog editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
};

/** 결과를 토스트로 알린다 — 성공이면 true */
const report = (result: SentenceActionResult, success: string) => {
  if (!result.ok) {
    toast.error(result.message);
    return false;
  }
  toast.success(success);
  return true;
};

const idForm = (id: string, extra?: Record<string, string>) => {
  const form = new FormData();
  form.set('id', id);
  for (const [key, value] of Object.entries(extra ?? {})) form.set(key, value);
  return form;
};

type SentenceRowProps = { sentence: AdminSentence; onEdit: () => void };

const SentenceRow = ({ sentence, onEdit }: SentenceRowProps) => {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const handleToggle = () =>
    startTransition(async () => {
      report(
        await toggleSentenceActive(
          idForm(sentence.id, { next: String(!sentence.is_active) })
        ),
        sentence.is_active ? '비활성으로 내렸어요.' : '다시 활성으로 올렸어요.'
      );
    });

  const handleDelete = () =>
    startTransition(async () => {
      report(await deleteSentence(idForm(sentence.id)), '문장을 지웠어요.');
    });

  return (
    <li
      className={`flex items-start gap-3 p-3 ${sentence.is_active ? '' : 'opacity-60'}`}
    >
      <BookCover
        src={sentence.cover_image}
        title={sentence.book_title}
        size='xs'
        small
        decorative
      />
      <div className='min-w-0 flex-1'>
        <p className='line-clamp-2 break-keep text-sm font-medium'>
          {sentence.text}
        </p>
        <p className='mt-1 truncate text-xs text-text-subtle'>
          《{sentence.book_title}》{sentence.author && ` · ${sentence.author}`}
          {sentence.translator && ` · ${sentence.translator} 옮김`}
          {sentence.page && ` · p. ${sentence.page}`}
        </p>
        <p className='mt-1 text-xs text-text-subtle'>
          <span
            className={sentence.is_active ? 'font-medium text-text-strong' : ''}
          >
            {sentence.is_active ? '활성' : '비활성'}
          </span>
          {` · 뽑힘 ${sentence.draw_count}회`}
          {!sentence.cover_image && ' · 표지 없음'}
          {sentence.rights_note && ` · 권리: ${sentence.rights_note}`}
        </p>
      </div>

      <div className='flex shrink-0 items-center gap-1'>
        <Button
          variant='outline'
          size='sm'
          onClick={handleToggle}
          disabled={pending}
        >
          {sentence.is_active ? '비활성' : '활성'}
        </Button>
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label='문장 수정'
          onClick={onEdit}
        >
          <Pencil className='size-3.5' aria-hidden />
        </Button>
        {/* 뽑힌 문장은 지울 수 없다 — 버튼 자체를 그리지 않는다 */}
        {sentence.draw_count === 0 && (
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label='문장 삭제'
            disabled={pending}
            onClick={() => setConfirming(true)}
          >
            <Trash2 className='size-3.5' aria-hidden />
          </Button>
        )}
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 문장을 지울까요?</AlertDialogTitle>
            <AlertDialogDescription>
              아직 아무도 뽑지 않은 문장이에요. 지우면 되돌릴 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction variant='destructive' onClick={handleDelete}>
              지우기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
};

type SentenceDialogProps = { editing: Editing; onClose: () => void };

/** 추가·수정 팝업 — 저장하면 닫히고 토스트, 실패하면 열린 채로 이유를 알린다 */
const SentenceDialog = ({ editing, onClose }: SentenceDialogProps) => {
  const [pending, startTransition] = useTransition();
  const isNew = editing === 'new';
  const initial = editing && editing !== 'new' ? editing : undefined;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      if (initial) form.set('id', initial.id);
      const result = initial
        ? await updateSentence(form)
        : await createSentence(form);
      if (report(result, initial ? '문장을 고쳤어요.' : '문장을 추가했어요.'))
        onClose();
    });
  };

  return (
    <Dialog
      open={editing !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{isNew ? '문장 추가' : '문장 수정'}</DialogTitle>
          <DialogDescription>
            책을 검색해 고르면 제목·저자·ISBN·표지가 채워져요.
          </DialogDescription>
        </DialogHeader>
        {/* key: 다른 문장을 열 때마다 입력칸을 새로 채운다 */}
        <form
          key={initial?.id ?? 'new'}
          onSubmit={handleSubmit}
          className='flex flex-col gap-4'
        >
          <SentenceFields initial={initial} />
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={pending}
            >
              취소
            </Button>
            <Button type='submit' disabled={pending}>
              {pending ? '저장 중…' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
