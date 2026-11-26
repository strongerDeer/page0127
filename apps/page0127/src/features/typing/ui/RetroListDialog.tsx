'use client';

import { useEffect, useId, useRef, useState } from 'react';

import s from './RetroListDialog.module.css';

/**
 * 옛 타자 연습 프로그램의 "긴 글 고르기" 창 느낌의 목록 창(HJ 2026-11-26 B안).
 *
 * - RetroListPanel: 창 자체(제목판 + 짙은 초록 목록 + 볼록 단추). 시작 화면처럼 처음부터 떠 있는 팝업에 쓴다.
 * - RetroListDialog: 고르기 단추를 누르면 <dialog> 로 같은 창을 띄운다(모바일 장·명문장 고르기).
 *
 * ↑↓ 로 옮기고 Enter·두 번 누르기로 확인, Esc 는 취소.
 * 색은 필사 창 LCD 와 같은 고정값(다크 모드에서도 같은 "화면 속 화면").
 */
export type RetroListItem = {
  key: string;
  label: string;
  /** 줄 아래 작은 설명 — "1장부터 차례로" 등 */
  desc?: string;
  /** 줄 오른쪽 작은 표시 — "다 씀", "준비 중" 등 */
  note?: string;
  disabled?: boolean;
};

type PanelProps = {
  /** 제목판 글자 — "장 고르기" */
  title: string;
  items: RetroListItem[];
  /** 처음 고른 줄 */
  initial: number;
  onConfirm: (index: number) => void;
  /** 없으면 취소 단추를 그리지 않는다 */
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 처음 그려질 때 목록에 포커스를 줄지(시작 화면은 페이지 맨 아래에 있어 false) */
  autoFocus?: boolean;
  className?: string;
};

export const RetroListPanel = ({
  title,
  items,
  initial,
  onConfirm,
  onCancel,
  confirmLabel = '확인',
  cancelLabel = '취소',
  autoFocus = false,
  className,
}: PanelProps) => {
  const listRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(initial);
  const listId = useId();

  useEffect(() => {
    if (autoFocus) listRef.current?.focus();
  }, [autoFocus]);

  // 고른 줄이 목록 밖에 있으면 목록 안에서만 굴린다(페이지는 움직이지 않게)
  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!list || !row) return;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop - 4;
    else if (
      row.offsetTop + row.offsetHeight >
      list.scrollTop + list.clientHeight
    )
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight + 4;
  }, [active]);

  const confirm = (index = active) => {
    if (items[index]?.disabled) return;
    onConfirm(index);
  };

  /** 막힌 줄은 건너뛰며 한 칸씩 */
  const move = (dir: 1 | -1) => {
    let i = active;
    for (let n = 0; n < items.length; n += 1) {
      i = (i + dir + items.length) % items.length;
      if (!items[i].disabled) return setActive(i);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') move(1);
    else if (e.key === 'ArrowUp') move(-1);
    else if (e.key === 'Enter' || e.key === ' ') confirm();
    else return;
    e.preventDefault();
  };

  return (
    <div className={`${s.panel} ${className ?? ''}`}>
      <p className={s.plate}>{title}</p>
      <div className={s.body}>
        <ul
          ref={listRef}
          id={listId}
          className={s.list}
          role='listbox'
          tabIndex={0}
          aria-label={title}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onKeyDown}
        >
          {items.map((item, i) => (
            <li
              key={item.key}
              id={`${listId}-${i}`}
              data-index={i}
              role='option'
              aria-selected={i === active}
              aria-disabled={item.disabled || undefined}
              className={s.row}
              onClick={() => !item.disabled && setActive(i)}
              onDoubleClick={() => confirm(i)}
            >
              <span className={s.rowText}>
                <span>{item.label}</span>
                {item.desc && <span className={s.desc}>{item.desc}</span>}
              </span>
              {item.note && <small>{item.note}</small>}
            </li>
          ))}
        </ul>
        <div className={s.buttons}>
          <button type='button' className={s.btn} onClick={() => confirm()}>
            {confirmLabel}
          </button>
          {onCancel && (
            <button type='button' className={s.btn} onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

type DialogProps = {
  title: string;
  items: RetroListItem[];
  /** 지금 고른 줄 */
  value: number;
  onPick: (index: number) => void;
  /** 고르기 단추에 붙는 class(보일 폭 조절은 부모 CSS 가 맡는다) */
  triggerClassName?: string;
};

export const RetroListDialog = ({
  title,
  items,
  value,
  onPick,
  triggerClassName,
}: DialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // 열 때마다 패널을 새로 그려 지금 고른 줄에서 시작한다
  const [openCount, setOpenCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const open = () => {
    setOpenCount((n) => n + 1);
    setIsOpen(true);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type='button'
        className={`${s.trigger} ${triggerClassName ?? ''}`}
        aria-haspopup='dialog'
        onClick={open}
      >
        <span className={s.triggerLabel}>{items[value]?.label ?? title}</span>
        <span className={s.triggerIcon} aria-hidden>
          ▾
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className={s.dialog}
        aria-label={title}
        onClose={() => setIsOpen(false)}
        // 바깥(어두운 막)을 누르면 닫는다
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        {isOpen && (
          <RetroListPanel
            key={openCount}
            title={title}
            items={items}
            initial={value}
            autoFocus
            onCancel={close}
            onConfirm={(i) => {
              close();
              if (i !== value) onPick(i);
            }}
          />
        )}
      </dialog>
    </>
  );
};
