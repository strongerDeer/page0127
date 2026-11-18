'use client';

import { useState, useTransition } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

import { decodeTextFile } from '@/features/book-import/model/decodeTextFile';

import { importSentences } from '../api/sentenceActions';
import { parseSentenceCsv } from '../model/sentenceCsv';

import type { SentenceCsvResult } from '../model/sentenceCsv';

/** 미리보기에서 보여 줄 문제 줄 수 — 나머지는 "외 N줄"로 */
const ERROR_PREVIEW = 5;

/**
 * CSV 올리기 팝업 (HJ, 2026-11-18).
 * 파일을 고르면 브라우저에서 먼저 읽어 몇 개가 들어갈지 보여 주고, "올리기"를 눌러야 저장한다.
 * 저장할 때는 서버가 파일 내용을 다시 검사한다(브라우저 결과를 믿지 않는다).
 */
export const SentenceImportDialog = () => {
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<SentenceCsvResult | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setCsvText('');
    setFileName('');
    setPreview(null);
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // 엑셀 "CSV(쉼표로 분리)"는 EUC-KR 이라 UTF-8 로만 읽으면 한글이 깨진다
    const text = decodeTextFile(await file.arrayBuffer());
    setFileName(file.name);
    setCsvText(text);
    setPreview(parseSentenceCsv(text));
  };

  const handleImport = () =>
    startTransition(async () => {
      const result = await importSentences(csvText);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const extra = [
        result.inserted > 0 &&
          `표지 ${result.covers}개는 ISBN으로 찾아 넣었어요`,
        result.skipped > 0 && `이미 있던 ${result.skipped}개는 건너뛰었어요`,
        result.invalid > 0 && `문제 있는 ${result.invalid}줄은 뺐어요`,
      ].filter(Boolean);
      toast.success(
        `문장 ${result.inserted}개를 넣었어요.${extra.length ? ` (${extra.join(', ')})` : ''}`
      );
      reset();
      setOpen(false);
    });

  const ready = preview?.ok ? preview.rows.length : 0;

  return (
    <>
      <Button size='sm' variant='outline' onClick={() => setOpen(true)}>
        <Upload aria-hidden />
        CSV 올리기
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>CSV로 한 번에 올리기</DialogTitle>
            <DialogDescription>
              첫 줄 머리글에 <code>text</code>(문장)와 <code>book_title</code>
              (책 제목)이 꼭 있어야 해요. author · translator · page · isbn ·
              rights_note 열은 있으면 함께 넣어요. 표지는 ISBN으로 자동으로
              찾아요. 이미 있는 문장은 건너뛰고, 넣은 문장은 바로 활성이에요.
            </DialogDescription>
          </DialogHeader>

          <input
            type='file'
            accept='.csv,.tsv,.txt,text/csv'
            onChange={handleFile}
            aria-label='CSV 파일 고르기'
            className='text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-transparent file:px-3 file:py-1.5 file:text-sm'
          />

          {preview && (
            <div className='rounded-lg border border-line p-3 text-sm'>
              <p className='mb-1 truncate text-xs text-text-subtle'>
                {fileName}
              </p>
              {preview.ok ? (
                <>
                  <p>
                    넣을 수 있는 문장{' '}
                    <b className='text-text-strong'>{preview.rows.length}개</b>
                    {preview.errors.length > 0 &&
                      ` · 문제 있는 줄 ${preview.errors.length}개`}
                  </p>
                  {preview.errors.length > 0 && (
                    <ul className='mt-2 flex flex-col gap-1 text-xs text-text-subtle'>
                      {preview.errors.slice(0, ERROR_PREVIEW).map((e) => (
                        <li key={e.line}>
                          {e.line}번째 줄: {e.message}
                        </li>
                      ))}
                      {preview.errors.length > ERROR_PREVIEW && (
                        <li>외 {preview.errors.length - ERROR_PREVIEW}줄</li>
                      )}
                    </ul>
                  )}
                </>
              ) : (
                <p className='text-destructive'>{preview.message}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                reset();
                setOpen(false);
              }}
              disabled={pending}
            >
              취소
            </Button>
            <Button
              type='button'
              onClick={handleImport}
              disabled={pending || ready === 0}
            >
              {pending ? '올리는 중…' : `${ready}개 올리기`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
