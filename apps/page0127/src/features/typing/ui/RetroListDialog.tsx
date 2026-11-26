'use client';

import { useEffect, useId, useRef, useState } from 'react';

import s from './RetroListDialog.module.css';

/**
 * 옛 타자 연습 프로그램의 "긴 글 고르기" 창 느낌의 목록 창(HJ 2026-11-26 B안).
 *
 * 기본 <select> 는 펼친 목록을 꾸밀 수 없어, 고르기 단추 + <dialog> 목록 창으로 바꿨다.
 * - 짙은 초록 목록에 연두 글자, 고른 줄은 주황 띠
 * - ↑↓ 로 옮기고 Enter·두 번 누르기로 확인, Esc 는 취소(<dialog> 기본 동작)
 * - 색은 필사 창과 같은 고정값(다크 모드에서도 같은 "화면 속 화면")
 */
export type RetroListItem = {
  key: string;
  label: string;
  /** 줄 오른쪽에 작게 — "다 씀", "준비 중" 등 */
  note?: string;
  disabled?: boolean;
};

type Props = {
  /** 제목판 글자 — "장 고르기" */
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
}: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(value);
  const listId = useId();

  const open = () => {
    setActive(value);
    dialogRef.current?.showModal();
    listRef.current?.focus();
  };
  const close = () => dialogRef.current?.close();
  const confirm = (index = active) => {
    if (items[index]?.disabled) return;
    close();
    if (index !== value) onPick(index);
  };

  // 고른 줄이 목록 밖에 있으면 보이게 굴린다
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

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
    else if (e.key === 'Home') setActive(items.findIndex((x) => !x.disabled));
    else if (e.key === 'Enter' || e.key === ' ') confirm();
    else return;
    e.preventDefault();
  };

  const current = items[value];

  return (
    <>
      <button
        type='button'
        className={`${s.trigger} ${triggerClassName ?? ''}`}
        aria-haspopup='dialog'
        onClick={open}
      >
        <span className={s.triggerLabel}>{current?.label ?? title}</span>
        <span className={s.triggerIcon} aria-hidden>
          ▾
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className={s.dialog}
        aria-label={title}
        // 바깥(어두운 막)을 누르면 닫는다
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className={s.panel}>
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
                  <span>{item.label}</span>
                  {item.note && <small>{item.note}</small>}
                </li>
              ))}
            </ul>
            <div className={s.buttons}>
              <button
                type='button'
                className={s.btn}
                onClick={() => confirm()}
              >
                확인
              </button>
              <button type='button' className={s.btn} onClick={close}>
                취소
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
};
