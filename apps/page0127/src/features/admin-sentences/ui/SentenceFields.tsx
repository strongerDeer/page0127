import { SENTENCE_MAX_LENGTH } from '../model/sentenceForm';

import type { AdminSentence } from '../api/getAdminSentences';

const inputClass =
  'w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm';

/** 추가·수정 폼이 같이 쓰는 입력칸 — 수정이면 기존 값을 채운다 */
export const SentenceFields = ({ initial }: { initial?: AdminSentence }) => (
  <div className='grid gap-2 sm:grid-cols-2'>
    <label className='sm:col-span-2'>
      <span className='text-xs text-text-subtle'>
        문장 (필수, {SENTENCE_MAX_LENGTH}자까지)
      </span>
      <textarea
        name='text'
        required
        maxLength={SENTENCE_MAX_LENGTH * 2}
        rows={3}
        defaultValue={initial?.text}
        className={inputClass}
      />
    </label>
    <label>
      <span className='text-xs text-text-subtle'>책 제목 (필수)</span>
      <input
        name='book_title'
        required
        defaultValue={initial?.book_title}
        className={inputClass}
      />
    </label>
    <label>
      <span className='text-xs text-text-subtle'>저자</span>
      <input
        name='author'
        defaultValue={initial?.author ?? ''}
        className={inputClass}
      />
    </label>
    <label>
      <span className='text-xs text-text-subtle'>옮긴이</span>
      <input
        name='translator'
        defaultValue={initial?.translator ?? ''}
        className={inputClass}
      />
    </label>
    <label>
      <span className='text-xs text-text-subtle'>쪽수</span>
      <input
        name='page'
        inputMode='numeric'
        defaultValue={initial?.page ?? ''}
        className={inputClass}
      />
    </label>
    <label>
      <span className='text-xs text-text-subtle'>ISBN</span>
      <input
        name='isbn'
        defaultValue={initial?.isbn ?? ''}
        className={inputClass}
      />
    </label>
    <label>
      <span className='text-xs text-text-subtle'>
        권리 메모 (허락·만료 근거, 사용자에게 안 보임)
      </span>
      <input
        name='rights_note'
        defaultValue={initial?.rights_note ?? ''}
        className={inputClass}
      />
    </label>
  </div>
);
