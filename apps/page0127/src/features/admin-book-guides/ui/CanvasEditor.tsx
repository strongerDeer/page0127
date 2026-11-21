'use client';

import { useEffect, useRef, useState } from 'react';

import { Button, cn, Input } from '@repo/ui';

import {
  buildCanvasLayout,
  CanvasPeople,
  GUIDE_TONES,
} from '@/entities/book-guide';

import {
  GRID,
  moveGroupBox,
  movePerson,
  updateGroup,
  updatePerson,
} from '../model/editPeopleSection';
import { CanvasSettings } from './CanvasSettings';
import { BorderPicker, ColorSwatches, FontPicker } from './StylePickers';

import type { GuideTone, PeopleSection } from '@/entities/book-guide';

/**
 * 관계도 편집기 — 사이트와 똑같은 그림(CanvasPeople) 위에 투명한 손잡이를 겹쳐 놓는다.
 *
 * 왜 그림을 따로 만들지 않고 겹치나:
 *   편집 화면과 실제 화면이 다르면 "편집기에선 맞았는데 사이트에선 어긋남" 이 생긴다.
 *   같은 컴포넌트를 그리고, 그 위에 같은 좌표(buildCanvasLayout)로 손잡이만 얹으면 어긋날 수 없다.
 *
 * 끌기: pointer 이벤트 + setPointerCapture — 마우스·터치·펜이 같은 코드로 움직이고,
 * 손잡이 밖으로 빨리 끌어도 놓치지 않는다. 움직이는 동안 매번 데이터를 바꿔 그림이 바로 따라온다.
 */

type Target = { kind: 'person'; id: string } | { kind: 'panel'; index: number };

type Drag = {
  target: Target;
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  rect: { x: number; y: number; w: number; h: number };
  /** 끌기 시작 때의 데이터 — 움직임은 늘 여기서부터 계산한다(누적 오차 없음) */
  base: PeopleSection;
};

const toneLabel: Record<GuideTone, string> = {
  primary: '파랑',
  green: '초록',
  outline: '초록 테두리',
  white: '흰 카드',
  line: '테두리 카드',
  sunken: '회색 카드',
};

const toneSwatch: Record<GuideTone, string> = {
  primary: 'bg-primary',
  green: 'bg-guide-green',
  outline: 'border-2 border-guide-green bg-card',
  white: 'border border-line-soft bg-card',
  line: 'border-2 border-line bg-card',
  sunken: 'bg-sunken',
};

const sameTarget = (a: Target | null, b: Target) =>
  !!a &&
  a.kind === b.kind &&
  (a.kind === 'person'
    ? a.id === (b as { id: string }).id
    : a.index === (b as { index: number }).index);

export const CanvasEditor = ({
  section,
  onChange,
}: {
  section: PeopleSection;
  onChange: (next: PeopleSection) => void;
}) => {
  const layout = buildCanvasLayout(section);
  const [selected, setSelected] = useState<Target | null>(null);
  const drag = useRef<Drag | null>(null);

  const apply = (base: PeopleSection, target: Target, rect: Drag['rect']) =>
    target.kind === 'person'
      ? movePerson(base, target.id, rect)
      : moveGroupBox(base, target.index, rect);

  const startDrag =
    (target: Target, rect: Drag['rect'], mode: Drag['mode']) =>
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      setSelected(target);
      drag.current = {
        target,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        rect,
        base: section,
      };
    };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const rect =
      d.mode === 'move'
        ? { ...d.rect, x: d.rect.x + dx, y: d.rect.y + dy }
        : { ...d.rect, w: d.rect.w + dx, h: d.rect.h + dy };
    onChange(apply(d.base, d.target, rect));
  };

  const endDrag = () => {
    drag.current = null;
  };

  // 방향키로 미세 조정 — 1px, Shift 는 한 칸(8px)
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select')) return;
      const step = e.shiftKey ? GRID : 1;
      const delta: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const move = delta[e.key];
      if (!move) return;
      e.preventDefault();
      const rect =
        selected.kind === 'person'
          ? layout.nodes.find((n) => n.person.id === selected.id)?.rect
          : layout.panels[selected.index]?.rect;
      if (!rect) return;
      // 1px 이동은 격자 맞춤(fitRect)을 거치지 않게 at 을 직접 쓴다
      const next = { ...rect, x: rect.x + move[0], y: rect.y + move[1] };
      onChange(
        selected.kind === 'person'
          ? updatePerson(section, selected.id, {
              at: { ...next, x: Math.max(0, next.x), y: Math.max(0, next.y) },
            })
          : moveGroupBox(section, selected.index, next)
      );
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, layout, section, onChange]);

  const panelIndexByKey = new Map(
    section.groups.flatMap((g, i) =>
      g.box ? [[g.id ?? `g${i}`, i] as const] : []
    )
  );

  const selectedPerson =
    selected?.kind === 'person'
      ? layout.nodes.find((n) => n.person.id === selected.id)?.person
      : undefined;
  const selectedGroup =
    selected?.kind === 'panel' ? section.groups[selected.index] : undefined;
  const selectedInGroup =
    selectedPerson &&
    section.groups.some((g) =>
      g.members.some((m) => m.id === selectedPerson.id)
    );

  const handle = (target: Target, rect: Drag['rect'], label: string) => (
    <div
      role='button'
      tabIndex={0}
      aria-label={`${label} 옮기기`}
      aria-pressed={sameTarget(selected, target)}
      onPointerDown={startDrag(target, rect, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onFocus={() => setSelected(target)}
      className={cn(
        'absolute cursor-move touch-none rounded-xl outline-offset-2 hover:outline-2 hover:outline-dashed hover:outline-primary',
        sameTarget(selected, target) && 'outline-2 outline-primary'
      )}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    >
      {sameTarget(selected, target) && (
        // 오른쪽 아래 모서리 — 크기 조절
        <span
          aria-hidden='true'
          onPointerDown={startDrag(target, rect, 'resize')}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          className='absolute -right-1.5 -bottom-1.5 size-3 cursor-nwse-resize rounded-sm border border-primary bg-card'
        />
      )}
    </div>
  );

  return (
    <div className='flex flex-col gap-4 lg:flex-row lg:items-start'>
      <div className='overflow-x-auto rounded-xl border border-line bg-card p-4'>
        {/* 격자 무늬 배경 — 8px 칸 */}
        <div
          className='relative'
          style={{
            width: layout.width,
            backgroundImage:
              'radial-gradient(var(--line) 1px, transparent 1px)',
            backgroundSize: `${GRID * 2}px ${GRID * 2}px`,
          }}
          onPointerDown={() => setSelected(null)}
        >
          <CanvasPeople section={section} />
          {/* 판 손잡이 먼저(아래), 사람 손잡이가 위 — 판 안의 사람을 집을 수 있게 */}
          {layout.panels.map((panel) => {
            const index = panelIndexByKey.get(panel.key);
            if (index === undefined) return null;
            return (
              <div key={panel.key}>
                {handle({ kind: 'panel', index }, panel.rect, panel.name)}
              </div>
            );
          })}
          {layout.nodes.map((node) => (
            <div key={node.person.id}>
              {handle(
                { kind: 'person', id: node.person.id },
                node.rect,
                node.person.name
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽 — 고른 상자의 글자·색 */}
      <aside className='flex w-full shrink-0 flex-col gap-3 rounded-xl border border-line bg-card p-4 lg:w-72'>
        {!selected && <CanvasSettings section={section} onChange={onChange} />}

        {selectedPerson && (
          <>
            <Field
              label='이름'
              value={selectedPerson.name}
              onChange={(name) =>
                onChange(updatePerson(section, selectedPerson.id, { name }))
              }
            />
            <Field
              label='별명 (선택)'
              value={selectedPerson.alias ?? ''}
              onChange={(alias) =>
                onChange(
                  updatePerson(section, selectedPerson.id, {
                    alias: alias || undefined,
                  })
                )
              }
            />
            <Field
              label='설명 (선택)'
              value={selectedPerson.role ?? ''}
              onChange={(role) =>
                onChange(
                  updatePerson(section, selectedPerson.id, {
                    role: role || undefined,
                  })
                )
              }
            />
            <div className='flex flex-col gap-1.5'>
              <span className='text-sm font-medium'>색</span>
              <div className='grid grid-cols-2 gap-1.5'>
                {GUIDE_TONES.map((tone) => (
                  <button
                    key={tone}
                    type='button'
                    aria-pressed={selectedPerson.tone === tone}
                    onClick={() =>
                      onChange(
                        updatePerson(section, selectedPerson.id, { tone })
                      )
                    }
                    className={cn(
                      'flex items-center gap-2 rounded-md border border-line px-2 py-1.5 text-sm',
                      selectedPerson.tone === tone &&
                        'border-primary bg-accent text-accent-foreground'
                    )}
                  >
                    <span
                      aria-hidden='true'
                      className={cn('size-4 rounded', toneSwatch[tone])}
                    />
                    {toneLabel[tone]}
                  </button>
                ))}
              </div>
            </div>
            <BorderPicker
              value={selectedPerson.border}
              onChange={(border) =>
                onChange(updatePerson(section, selectedPerson.id, { border }))
              }
            />
            <FontPicker
              value={selectedPerson.font}
              inheritLabel='캔버스 따라감'
              onChange={(font) =>
                onChange(updatePerson(section, selectedPerson.id, { font }))
              }
            />
            {selectedInGroup && selectedPerson.at && (
              <Button
                variant='outline'
                size='sm'
                onClick={() =>
                  onChange(
                    updatePerson(section, selectedPerson.id, { at: undefined })
                  )
                }
              >
                묶음 판 안 자동 자리로
              </Button>
            )}
          </>
        )}

        {selected?.kind === 'panel' && selectedGroup && (
          <>
            <Field
              label='묶음 이름'
              value={selectedGroup.name}
              onChange={(name) =>
                onChange(updateGroup(section, selected.index, { name }))
              }
            />
            <div className='flex flex-col gap-1.5'>
              <span className='text-sm font-medium'>판 안 열 수</span>
              <div className='flex gap-1.5'>
                {[1, 2, 3, 4].map((cols) => (
                  <button
                    key={cols}
                    type='button'
                    aria-pressed={(selectedGroup.cols ?? 1) === cols}
                    onClick={() =>
                      onChange(updateGroup(section, selected.index, { cols }))
                    }
                    className={cn(
                      'size-9 rounded-md border border-line text-sm',
                      (selectedGroup.cols ?? 1) === cols &&
                        'border-primary bg-accent text-accent-foreground'
                    )}
                  >
                    {cols}
                  </button>
                ))}
              </div>
            </div>
            <ColorSwatches
              label='판 색'
              value={selectedGroup.fill}
              noneLabel='기본 회색'
              onChange={(fill) =>
                onChange(updateGroup(section, selected.index, { fill }))
              }
            />
            <BorderPicker
              value={selectedGroup.border}
              onChange={(border) =>
                onChange(updateGroup(section, selected.index, { border }))
              }
            />
          </>
        )}
      </aside>
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  // label 로 감싸 입력칸과 이름을 잇는다(htmlFor 용 id 를 따로 만들 필요가 없다)
  <label className='flex flex-col gap-1.5 text-sm font-medium'>
    {label}
    <Input value={value} onChange={(e) => onChange(e.target.value)} />
  </label>
);
