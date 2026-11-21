'use client';

import { useState, useTransition } from 'react';

import { Button, cn, Textarea } from '@repo/ui';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { BookGuide, bookGuideSectionsSchema } from '@/entities/book-guide';

import { saveBookGuide } from '../api/guideActions';
import { toCanvas } from '../model/editPeopleSection';
import { figmaSvgToPeopleSection } from '../model/figmaSvg';
import { CanvasEditor } from './CanvasEditor';

import type { BookGuideSection, PeopleSection } from '@/entities/book-guide';

/**
 * 읽기 가이드 편집 화면 — 관계도는 끌어서, 나머지(연표·산책 코스·관계선)는 JSON 으로.
 *
 * 상태는 sections 배열 하나다. 끌기 편집기와 JSON 칸이 같은 값을 고치므로
 * 어느 쪽에서 바꿔도 아래 미리보기(사이트와 같은 BookGuide)에 바로 보인다.
 * 저장은 서버 액션 — 서버가 같은 Zod 스키마로 한 번 더 검사한다.
 */

const sectionLabel: Record<BookGuideSection['type'], string> = {
  people: '인물관계도',
  timeline: '연표',
  places: '산책 코스',
};

export const GuideEditor = ({
  bookId,
  bookTitle,
  initialStatus,
  initialSections,
}: {
  bookId: string;
  bookTitle: string;
  initialStatus: 'draft' | 'published';
  initialSections: BookGuideSection[];
}) => {
  const [sections, setSections] = useState(initialSections);
  const [status, setStatus] = useState(initialStatus);
  const [active, setActive] = useState(0);
  const [json, setJson] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const current = sections[active];

  const replaceSection = (next: BookGuideSection) =>
    setSections((prev) => prev.map((s, i) => (i === active ? next : s)));

  const applyJson = () => {
    if (json === null) return;
    let value: unknown;
    try {
      value = JSON.parse(json);
    } catch {
      setJsonError('JSON 문법이 맞지 않아요. 쉼표·따옴표를 확인해 주세요.');
      return;
    }
    const parsed = bookGuideSectionsSchema.safeParse(value);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setJsonError(`${issue.path.join('.')} — ${issue.message}`);
      return;
    }
    setSections(parsed.data);
    setActive((i) => Math.min(i, parsed.data.length - 1));
    setJson(null);
    setJsonError(null);
  };

  /**
   * 피그마 SVG 가져오기 — 파일마다 인물관계도 하나. 같은 제목이 있으면 바꾸고, 없으면 앞쪽에 더한다.
   * 파일은 브라우저 안에서만 읽는다(서버로 올리지 않음) — 저장은 평소처럼 저장 버튼으로.
   */
  const importSvgs = async (files: FileList | null) => {
    if (!files?.length) return;
    let next = sections;
    for (const file of Array.from(files)) {
      const result = figmaSvgToPeopleSection(await file.text());
      if (!result.ok) {
        toast.error(`${file.name}: ${result.message}`);
        continue;
      }
      result.warnings.forEach((w) => toast.warning(`${file.name}: ${w}`));
      const at = next.findIndex(
        (s) => s.type === 'people' && s.title === result.section.title
      );
      const peopleCount = next.filter((s) => s.type === 'people').length;
      next =
        at >= 0
          ? next.map((s, i) => (i === at ? result.section : s))
          : [
              ...next.slice(0, peopleCount),
              result.section,
              ...next.slice(peopleCount),
            ];
    }
    const parsed = bookGuideSectionsSchema.safeParse(next);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      toast.error(
        `가져온 데이터가 맞지 않아요: ${issue.path.join('.')} — ${issue.message}`
      );
      return;
    }
    setSections(parsed.data);
    toast.success('피그마 관계도를 가져왔어요. 확인 후 저장해 주세요.');
  };

  const save = (nextStatus: 'draft' | 'published') =>
    startSaving(async () => {
      const result = await saveBookGuide({
        globalBookId: bookId,
        status: nextStatus,
        sections,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setStatus(nextStatus);
      toast.success(
        nextStatus === 'published'
          ? '발행했어요. 책 정보 페이지에 바로 보여요.'
          : '초안으로 저장했어요.'
      );
    });

  return (
    <div className='flex flex-col gap-6'>
      <header className='flex flex-wrap items-center gap-2'>
        <h1 className='text-base font-medium'>{bookTitle} — 읽기 가이드</h1>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            status === 'published'
              ? 'bg-accent text-accent-foreground'
              : 'bg-sunken text-text-subtle'
          )}
        >
          {status === 'published' ? '발행됨' : '초안'}
        </span>
        <a
          href={`/books/info/${bookId}`}
          target='_blank'
          rel='noreferrer'
          className='ml-auto flex items-center gap-1 text-sm text-text-subtle hover:text-text-strong'
        >
          책 정보 페이지
          <ExternalLink aria-hidden='true' className='size-3.5' />
        </a>
        <Button
          variant='outline'
          size='sm'
          disabled={saving || sections.length === 0}
          onClick={() => save('draft')}
        >
          초안 저장
        </Button>
        <Button
          size='sm'
          disabled={saving || sections.length === 0}
          onClick={() => save('published')}
        >
          발행
        </Button>
      </header>

      {/* 섹션 고르기 */}
      <nav aria-label='가이드 섹션' className='flex flex-wrap gap-1.5'>
        {sections.map((s, i) => (
          <button
            key={`${s.type}-${i}`}
            type='button'
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            className={cn(
              'rounded-full border border-line px-3 py-1 text-sm',
              i === active && 'border-primary bg-accent text-accent-foreground'
            )}
          >
            {sectionLabel[s.type]} · {s.title}
          </button>
        ))}
        <label className='cursor-pointer rounded-full border border-dashed border-line px-3 py-1 text-sm text-text-subtle hover:text-text-strong'>
          피그마 SVG 가져오기
          <input
            type='file'
            accept='.svg,image/svg+xml'
            multiple
            className='sr-only'
            onChange={(e) => {
              void importSvgs(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        <button
          type='button'
          aria-pressed={json !== null}
          onClick={() => {
            setJson(json === null ? JSON.stringify(sections, null, 2) : null);
            setJsonError(null);
          }}
          className={cn(
            'rounded-full border border-dashed border-line px-3 py-1 text-sm text-text-subtle',
            json !== null && 'border-primary text-accent-foreground'
          )}
        >
          {'{ }'} JSON 전체 고치기
        </button>
      </nav>

      {json !== null ? (
        <div className='flex flex-col gap-2'>
          <Textarea
            aria-label='가이드 JSON'
            value={json}
            onChange={(e) => setJson(e.target.value)}
            className='min-h-96 font-mono text-xs'
          />
          {jsonError && (
            <p role='alert' className='text-sm text-destructive'>
              {jsonError}
            </p>
          )}
          <div className='flex gap-2'>
            <Button size='sm' onClick={applyJson}>
              적용
            </Button>
            <Button variant='outline' size='sm' onClick={() => setJson(null)}>
              취소
            </Button>
          </div>
        </div>
      ) : current?.type === 'people' ? (
        current.canvas ? (
          <CanvasEditor
            section={current}
            onChange={(next: PeopleSection) => replaceSection(next)}
          />
        ) : (
          <div className='flex flex-col items-start gap-2 rounded-xl border border-line p-4'>
            <p className='text-sm text-text-subtle'>
              이 관계도는 자동 배치예요. 자리를 직접 정하려면 캔버스로 바꿔
              주세요. 묶음 판이 3열로 놓이고, 그다음 끌어서 다듬으면 돼요.
            </p>
            <Button size='sm' onClick={() => replaceSection(toCanvas(current))}>
              자리 직접 정하기
            </Button>
          </div>
        )
      ) : current ? (
        <p className='rounded-xl border border-line p-4 text-sm text-text-subtle'>
          {sectionLabel[current.type]}은 끌기 편집이 없어요. 위 &quot;JSON 전체
          고치기&quot;에서 고쳐 주세요.
        </p>
      ) : (
        <p className='rounded-xl border border-line p-4 text-sm text-text-subtle'>
          아직 섹션이 없어요. &quot;JSON 전체 고치기&quot;에 붙여 넣어 시작해
          주세요.
        </p>
      )}

      {/* 미리보기 — 사이트와 같은 컴포넌트 */}
      {sections.length > 0 && (
        <section
          aria-label='미리보기'
          className='rounded-xl border border-line p-4'
        >
          <p className='mb-2 text-xs font-medium text-text-subtle'>미리보기</p>
          <BookGuide sections={sections} />
        </section>
      )}
    </div>
  );
};
