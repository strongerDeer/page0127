'use client';

import {
  type ChangeEvent,
  type CompositionEvent,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  FAMOUS_SHEETS,
  firstUnwrittenIndex,
  FULL_SHEETS,
  judgeTyping,
  LITTLE_PRINCE_TOTAL_CHAPTERS,
  OPEN_CHAPTERS,
  splitLines,
  splitLinesToFit,
  strokesPerMinute,
} from '@/entities/typing';

import {
  startGuestTypingAction,
  submitGuestTypingAction,
} from '../api/guestTypingActions';
import {
  recordTypingPageAction,
  setTypingRankOptInAction,
} from '../api/typingActions';
import {
  GUEST_NICKNAME_MAX,
  validateGuestNickname,
} from '../model/guestNickname';
import { PixelPicture } from './PixelPicture';

import type { TypingSheet } from '@/entities/typing';

import s from './TypingRoom.module.css';

type Mode = 'full' | 'chapter' | 'famous';
type Face = 'base' | 'focus' | 'happy' | 'sad';

/** 비회원 랭킹 올리기 / 회원 순위 참여 켜기 — 결과 창 안에서 하는 일 */
type RankAction =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'done' }
  | { status: 'error'; message: string };

/** 비회원 닉네임을 다음에도 채워 두는 곳(이 브라우저에만) */
const NICKNAME_STORAGE_KEY = 'p0127:typing-guest-nickname';

/** 타수 랭킹에 오르는 정확도 기준 — DB 와 같다 */
const SPEED_RANK_MIN_ACCURACY = 95;

type Result = {
  cpm: number;
  accuracy: number;
  durationMs: number;
  save: 'saving' | 'saved' | 'guest' | 'error';
  message?: string;
};

/** 화면에 한 번에 보여 줄 줄 묶음 수 — 넘치면 스크롤 대신 위로 밀어 올린다 */
const VISIBLE_PAIRS = 4;
/** 분당 600타를 상태 줄 막대의 끝으로 본다 */
const CPM_BAR_MAX = 600;

const MODES: { key: Mode; label: string }[] = [
  { key: 'famous', label: '명문장만' },
  { key: 'full', label: '전문 이어 쓰기' },
  { key: 'chapter', label: '장 고르기' },
];

/** 시작 화면 설명 — 옛 타자 프로그램이 처음에 메뉴부터 띄우던 것처럼(HJ 2026-11-26) */
const MODE_DESCRIPTIONS: Record<Mode, string> = {
  famous: `가장 사랑받는 대목 ${FAMOUS_SHEETS.length}개를 짧게 한 대목씩`,
  full: '1장부터 차례로, 쓰던 곳에서 이어서',
  chapter: `${LITTLE_PRINCE_TOTAL_CHAPTERS}장 가운데 쓰고 싶은 장을 골라서`,
};

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (ms: number) => {
  const sec = Math.floor(ms / 1000);
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
};
const minutesSeconds = (ms: number) => {
  const sec = Math.floor(ms / 1000);
  return `${Math.floor(sec / 60)}분 ${sec % 60}초`;
};

/** 폭에 맞는 한 줄 글자 수 — 옛 프로그램처럼 줄 단위로 끊어 원문/입력 두 줄을 나란히 둔다 */
const perLineFor = (width: number) =>
  width < 360 ? 13 : width < 460 ? 17 : width < 620 ? 22 : 28;

export const TypingRoom = ({
  memberId,
  rankOptIn,
  initialDoneKeys,
  loginHref,
}: {
  memberId: string | null;
  /** 회원의 순위 참여 여부 — 결과 창에서 "랭킹에 반영되는지"를 바로 알려 준다 */
  rankOptIn: boolean;
  initialDoneKeys: string[];
  loginHref: string;
}) => {
  const router = useRouter();
  // 처음엔 방식 고르는 시작 화면. 하나를 고르면 바로 친다(HJ 2026-11-26)
  const [started, setStarted] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  const [optIn, setOptIn] = useState(rankOptIn);
  const [rankAction, setRankAction] = useState<RankAction>({
    status: 'idle',
  });
  const [nickname, setNickname] = useState('');
  // 비회원 시작 토큰 — 첫 글자를 칠 때 서버가 서명해 준다. 화면에 그리지 않으므로 ref
  const guestTokenRef = useRef<{ key: string; token: string } | null>(null);

  useEffect(() => {
    if (memberId) return;
    try {
      const saved = window.localStorage.getItem(NICKNAME_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 저장소는 마운트 뒤에만 읽을 수 있다(서버 그림과 어긋나지 않게)
      if (saved) setNickname(saved);
    } catch {
      // 사생활 보호 모드 등 — 비워 둔다
    }
  }, [memberId]);
  const [doneKeys, setDoneKeys] = useState(() => new Set(initialDoneKeys));
  const [mode, setMode] = useState<Mode>('famous'); // 기본은 짧은 명문장(HJ 2026-11-25);
  const [fullIndex, setFullIndex] = useState(() =>
    firstUnwrittenIndex(new Set(initialDoneKeys))
  );
  const [famousIndex, setFamousIndex] = useState(0);

  const sheet: TypingSheet =
    mode === 'famous' ? FAMOUS_SHEETS[famousIndex] : FULL_SHEETS[fullIndex];

  // 타이핑 상태 — 쪽이 바뀌면 resetTyping 으로 모두 비운다
  const [value, setValue] = useState('');
  const [composing, setComposing] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  // 한 번이라도 판정한 위치 / 한 번이라도 틀린 위치 — 고쳐 써도 정확도에는 남는다
  const [seen, setSeen] = useState<{ typed: Set<number>; missed: Set<number> }>(
    () => ({ typed: new Set(), missed: new Set() })
  );
  const [result, setResult] = useState<Result | null>(null);
  const [, startSaving] = useTransition();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [focusTick, setFocusTick] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  const isResultOpen = result !== null;
  // 결과 창이 뜨면 버튼이 아니라 창 자체에 포커스 — 치던 흐름의 스페이스가 버튼을 누르지 않게
  useEffect(() => {
    if (isResultOpen) dialogRef.current?.focus({ preventScroll: true });
  }, [isResultOpen]);

  // 쪽을 넘기거나 장·명문장을 고른 뒤 화면을 다시 누르지 않아도 바로 이어 치게
  useEffect(() => {
    if (focusTick === 0 || result) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [focusTick, result]);
  const paperRef = useRef<HTMLDivElement>(null);
  const [perLine, setPerLine] = useState(26);
  // 실제 글꼴로 잰 "이 줄이 들어가나" 함수. 재기 전(서버 그림·첫 화면)에는 글자 수(perLine)로 어림한다.
  const [fits, setFits] = useState<((line: string) => boolean) | null>(null);

  useEffect(() => {
    const el = paperRef.current;
    if (!el) return;
    const ctx = document.createElement('canvas').getContext('2d');
    const measure = () => {
      const width = el.getBoundingClientRect().width;
      setPerLine(perLineFor(width));
      const pair = el.querySelector<HTMLElement>(`.${s.pair}`);
      if (!ctx || !pair) return;
      const st = getComputedStyle(pair);
      const fontSize = parseFloat(st.fontSize);
      const letter = parseFloat(st.letterSpacing) || 0;
      // 칸 폭 - 좌우 여백 - 커서 한 칸(0.62em) - 여유 2px
      const avail =
        pair.clientWidth -
        parseFloat(st.paddingLeft) -
        parseFloat(st.paddingRight) -
        fontSize * 0.62 -
        2;
      ctx.font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
      setFits(
        () => (line: string) =>
          ctx.measureText(line).width + letter * line.length <= avail
      );
    };
    measure();
    // 웹 글꼴이 늦게 오면 폭이 바뀌므로 다시 잰다
    void document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
    // started: 시작 화면에는 종이(paperRef)가 없다. 방식을 고르고 종이가 생긴 뒤에 다시 재야
    // 실제 폭으로 줄을 나눈다 — 안 그러면 기본 26자로 나눠 모바일에서 줄이 넘친다.
  }, [started]);

  // 시계 — 치기 시작해서 끝날 때까지만 돈다
  useEffect(() => {
    if (startedAt === null || result) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [startedAt, result]);

  const elapsed =
    startedAt === null ? 0 : (result?.durationMs ?? now - startedAt);
  const judge = judgeTyping(value, sheet.text, composing);
  const accuracy = seen.typed.size
    ? Math.round(((seen.typed.size - seen.missed.size) / seen.typed.size) * 100)
    : 100;
  const cpm = result?.cpm ?? strokesPerMinute(judge.correctStrokes, elapsed);
  const typedCount = Math.min(value.length, sheet.text.length);

  const lines = useMemo(
    () =>
      fits
        ? splitLinesToFit(sheet.text, fits)
        : splitLines(sheet.text, perLine),
    [sheet.text, perLine, fits]
  );
  const currentLine = Math.max(
    0,
    lines.findIndex(
      (l, i) =>
        typedCount < l.end || (i === lines.length - 1 && typedCount === l.end)
    )
  );
  const firstVisible = Math.min(
    Math.max(0, currentLine - 1),
    Math.max(0, lines.length - VISIBLE_PAIRS)
  );
  const wrongSet = new Set(judge.wrong);

  const lastSettledWrong = judge.settled > 0 && wrongSet.has(judge.settled - 1);
  const face: Face = result
    ? 'happy'
    : startedAt === null
      ? 'base'
      : lastSettledWrong || accuracy < 90
        ? 'sad'
        : 'focus';

  const resetTyping = () => {
    setValue('');
    setComposing(false);
    setStartedAt(null);
    setNow(0);
    setSeen({ typed: new Set(), missed: new Set() });
    setResult(null);
    setRankAction({ status: 'idle' });
    guestTokenRef.current = null;
  };

  /** 결과 창 "종료" — 방식 고르는 시작 화면으로 돌아간다 */
  const closeToMenu = () => {
    resetTyping();
    setStarted(false);
  };

  // Esc 는 결과 창 어디서든 "종료". 버튼이 잠깐 disabled 되면 포커스가 창 밖(body)으로 빠지므로
  // 창의 onKeyDown 이 아니라 window 에서 듣는다. useEffectEvent: closeToMenu 는 매번 새 함수지만
  // "다시 구독할 이유"는 아니다 — 결과 창이 열리고 닫힐 때만 구독을 바꾼다.
  const onEscape = useEffectEvent(() => closeToMenu());
  useEffect(() => {
    if (!isResultOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      onEscape();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isResultOpen]);

  /** 비회원: 닉네임으로 타수 랭킹에 올리기 */
  const submitGuestRank = () => {
    if (!result || rankAction.status === 'sending') return;
    const check = validateGuestNickname(nickname);
    if (!check.ok) {
      setRankAction({ status: 'error', message: check.message });
      return;
    }
    const started = guestTokenRef.current;
    if (!started || started.key !== sheet.key) {
      setRankAction({
        status: 'error',
        message: '시작 기록이 없어요. 다시 쳐 주세요.',
      });
      return;
    }
    setRankAction({ status: 'sending' });
    startSaving(async () => {
      const res = await submitGuestTypingAction({
        token: started.token,
        nickname: check.nickname,
        cpm: result.cpm,
        accuracy: result.accuracy,
      });
      if (!res.ok) {
        setRankAction({ status: 'error', message: res.message });
        return;
      }
      try {
        window.localStorage.setItem(NICKNAME_STORAGE_KEY, check.nickname);
      } catch {
        // 저장 못 해도 다음에 다시 적으면 된다
      }
      setRankAction({ status: 'done' });
      router.refresh();
    });
  };

  /** 회원: 결과 창에서 바로 순위 참여 켜기 */
  const turnOnRank = () => {
    setRankAction({ status: 'sending' });
    startSaving(async () => {
      const res = await setTypingRankOptInAction(true);
      if (!res.ok) {
        setRankAction({ status: 'error', message: res.message });
        return;
      }
      setOptIn(true);
      setRankAction({ status: 'done' });
      router.refresh();
    });
  };

  /** at·from 은 이벤트 핸들러에서 잰 시각 — 렌더 중에 Date.now() 를 부르지 않는다 */
  const finish = (finalValue: string, at: number, from: number) => {
    const durationMs = Math.max(1000, at - from);
    const finalJudge = judgeTyping(finalValue, sheet.text, false);
    const finalSeen = track(finalValue, false);
    const finalAccuracy = finalSeen.typed.size
      ? Math.round(
          ((finalSeen.typed.size - finalSeen.missed.size) /
            finalSeen.typed.size) *
            100
        )
      : 100;
    const finalCpm = strokesPerMinute(finalJudge.correctStrokes, durationMs);
    const base = { cpm: finalCpm, accuracy: finalAccuracy, durationMs };

    if (!memberId) {
      setResult({ ...base, save: 'guest' });
      return;
    }
    setResult({ ...base, save: 'saving' });
    const key = sheet.key;
    startSaving(async () => {
      const saved = await recordTypingPageAction({
        pageKey: key,
        cpm: finalCpm,
        accuracy: finalAccuracy,
        durationMs,
      });
      if (saved.ok) {
        setDoneKeys((prev) => new Set(prev).add(key));
        setResult((r) => (r ? { ...r, save: 'saved' } : r));
        router.refresh(); // 진행도·랭킹을 서버 값으로 다시 그린다
      } else {
        setResult((r) =>
          r ? { ...r, save: 'error', message: saved.message } : r
        );
      }
    });
  };

  /** 판정한 위치를 기억에 더한다(틀렸다 고친 글자도 정확도에 남게) */
  const track = (nextValue: string, isComposing: boolean) => {
    const j = judgeTyping(nextValue, sheet.text, isComposing);
    const typed = new Set(seen.typed);
    const missed = new Set(seen.missed);
    for (let i = 0; i < j.settled; i++) typed.add(i);
    j.wrong.forEach((i) => missed.add(i));
    const next = { typed, missed };
    setSeen(next);
    return next;
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (result) return;
    const next = e.target.value.replace(/\n/g, '').slice(0, sheet.text.length);
    const t = Date.now();
    if (startedAt === null && next.length > 0) {
      setStartedAt(t);
      setNow(t);
      // 비회원은 시작 시각을 서버에 맡겨 둔다 — 랭킹에 올릴 때 서버 시계로 걸린 시간을 잰다
      if (!memberId) {
        const key = sheet.key;
        void startGuestTypingAction(key).then((res) => {
          if (res.ok) guestTokenRef.current = { key, token: res.token };
        });
      }
    }
    const isComposing =
      (e.nativeEvent as InputEvent).isComposing === true || composing;
    setValue(next);
    track(next, isComposing);
    if (!isComposing && next.length >= sheet.text.length)
      finish(next, t, startedAt ?? t);
  };

  const handleCompositionEnd = (e: CompositionEvent<HTMLTextAreaElement>) => {
    setComposing(false);
    if (result) return;
    const next = e.currentTarget.value
      .replace(/\n/g, '')
      .slice(0, sheet.text.length);
    setValue(next);
    track(next, false);
    const t = Date.now();
    if (next.length >= sheet.text.length) finish(next, t, startedAt ?? t);
  };

  /** 필사 창을 화면 맨 위에 맞춘다 — 치는 동안 창 전체(원문·입력·상태 줄)가 한 화면에 보이게(HJ 2026-11-26) */
  const fitWindowToScreen = () => {
    const el = windowRef.current;
    if (!el) return;
    // 이미 위쪽에 거의 맞아 있으면 움직이지 않는다(다음 쪽마다 덜컹거리지 않게)
    if (Math.abs(el.getBoundingClientRect().top - 24) < 48) return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  };

  const goTo = (nextMode: Mode, index: number) => {
    fitWindowToScreen();
    setStarted(true);
    setMode(nextMode);
    if (nextMode === 'famous') setFamousIndex(index);
    else setFullIndex(index);
    resetTyping();
    // 결과 창이 떠 있는 동안 입력칸은 disabled 라 지금 focus() 하면 무시된다.
    // 결과가 닫히고 다음 쪽이 그려진 뒤(아래 effect) 입력칸으로 커서를 돌려준다.
    setFocusTick((n) => n + 1);
  };

  const goNext = () => {
    if (mode === 'famous')
      return goTo('famous', (famousIndex + 1) % FAMOUS_SHEETS.length);
    if (mode === 'full')
      return goTo('full', firstUnwrittenIndex(doneKeys, fullIndex + 1));
    return goTo('chapter', (fullIndex + 1) % FULL_SHEETS.length);
  };

  /** 장을 고르면 그 장에서 아직 안 쓴 첫 쪽으로(다 썼으면 첫 쪽) */
  const pickChapter = (no: number) => {
    const pages = FULL_SHEETS.map((x, i) => ({ x, i })).filter(
      ({ x }) => x.chapter === no
    );
    if (pages.length === 0) return;
    const todo = pages.find(({ x }) => !doneKeys.has(x.key));
    goTo('chapter', (todo ?? pages[0]).i);
  };

  const chapterState = (no: number) => {
    const pages = FULL_SHEETS.filter((x) => x.chapter === no);
    const done = pages.filter((x) => doneKeys.has(x.key)).length;
    return done === pages.length ? 'full' : done > 0 ? 'half' : 'none';
  };

  const hint = !started
    ? '어떤 방식으로 써 볼지 고르면 바로 시작해요.'
    : result
      ? '끝까지 썼어요!'
      : startedAt === null
        ? '종이를 누르고 타이핑을 시작하면 시간이 재기 시작해요. Enter 없이 띄어쓰기만 맞추면 돼요.'
        : '틀린 글자는 빨간 칸으로 보여요. 지우고 다시 쳐도 돼요.';

  return (
    <div
      id='typing-room'
      ref={windowRef}
      className={s.window}
      data-started={started}
    >
      <div className={s.titlebar}>
        <svg viewBox='0 0 16 16' aria-hidden>
          <rect x='2' y='2' width='12' height='12' fill='#fff' />
          <rect x='4' y='5' width='8' height='1' fill='#7a5a35' />
          <rect x='4' y='8' width='8' height='1' fill='#7a5a35' />
          <rect x='4' y='11' width='5' height='1' fill='#7a5a35' />
        </svg>
        <span className={s.title}>page0127. 온라인 필사 — 어린 왕자</span>
        <span className={`${s.tbBtn} ${s.raised}`} aria-hidden>
          _
        </span>
        <span className={`${s.tbBtn} ${s.raised}`} aria-hidden>
          ×
        </span>
      </div>

      <div className={s.inner}>
        <div className={s.tabs} role='group' aria-label='필사 방식'>
          {MODES.map((m) => (
            <button
              key={m.key}
              type='button'
              className={s.tab}
              aria-pressed={started && mode === m.key}
              onClick={() =>
                goTo(
                  m.key,
                  m.key === 'famous' ? 0 : firstUnwrittenIndex(doneKeys)
                )
              }
            >
              {m.label}
            </button>
          ))}
        </div>

        {started && (
          <div className={s.sub}>
            {mode === 'full' && (
              <span>
                이어서 쓰는 곳: <b>{sheet.title}</b> · 다 쓰면 다음 쪽으로
                넘어가요
              </span>
            )}
            {mode === 'chapter' && (
              <>
                <div className={s.chgrid} role='group' aria-label='장 고르기'>
                  {Array.from(
                    { length: LITTLE_PRINCE_TOTAL_CHAPTERS },
                    (_, i) => i + 1
                  ).map((no) => {
                    const open = OPEN_CHAPTERS.includes(no);
                    const state = open ? chapterState(no) : 'locked';
                    return (
                      <button
                        key={no}
                        type='button'
                        className={s.chb}
                        disabled={!open}
                        data-state={state}
                        aria-pressed={sheet.chapter === no}
                        aria-label={
                          open
                            ? `${no}장${state === 'full' ? ' (다 씀)' : ''}`
                            : `${no}장 (준비 중)`
                        }
                        onClick={() => pickChapter(no)}
                      >
                        {state === 'full' ? '✓' : no}
                      </button>
                    );
                  })}
                </div>
                {/* 모바일은 27개 버튼 대신 고르기 상자 하나(HJ 2026-11-26) — CSS 가 폭에 따라 둘 중 하나만 보인다 */}
                <select
                  className={s.pickSelect}
                  aria-label='장 고르기'
                  value={sheet.chapter ?? ''}
                  onChange={(e) => pickChapter(Number(e.target.value))}
                >
                  {Array.from(
                    { length: LITTLE_PRINCE_TOTAL_CHAPTERS },
                    (_, i) => i + 1
                  ).map((no) => {
                    const open = OPEN_CHAPTERS.includes(no);
                    return (
                      <option key={no} value={no} disabled={!open}>
                        {no}장
                        {!open
                          ? ' (준비 중)'
                          : chapterState(no) === 'full'
                            ? ' ✓ 다 씀'
                            : ''}
                      </option>
                    );
                  })}
                </select>
              </>
            )}
            {mode === 'famous' && (
              <div className={s.chips} role='group' aria-label='명문장 고르기'>
                {FAMOUS_SHEETS.map((f, i) => (
                  <button
                    key={f.key}
                    type='button'
                    className={s.chip}
                    aria-pressed={i === famousIndex}
                    data-done={doneKeys.has(f.key)}
                    onClick={() => goTo('famous', i)}
                  >
                    {f.title.replace('명문장 · ', '')}
                  </button>
                ))}
              </div>
            )}
            {mode === 'famous' && (
              <select
                className={s.pickSelect}
                aria-label='명문장 고르기'
                value={famousIndex}
                onChange={(e) => goTo('famous', Number(e.target.value))}
              >
                {FAMOUS_SHEETS.map((f, i) => (
                  <option key={f.key} value={i}>
                    {f.title.replace('명문장 · ', '')}
                    {doneKeys.has(f.key) ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className={s.main} data-started={started}>
          {!started ? (
            <div className={`${s.frame} ${s.raised}`}>
              <div className={`${s.paper} ${s.menuPaper}`}>
                <p className={s.menuTitle}>어떤 방식으로 써 볼까요?</p>
                <div
                  className={s.menu}
                  role='group'
                  aria-label='필사 방식 고르기'
                >
                  {MODES.map((m, i) => (
                    <button
                      key={m.key}
                      type='button'
                      className={s.menuItem}
                      onClick={() =>
                        goTo(
                          m.key,
                          m.key === 'famous' ? 0 : firstUnwrittenIndex(doneKeys)
                        )
                      }
                    >
                      <span className={s.menuNo}>{i + 1}</span>
                      <span className={s.menuText}>
                        <b>{m.label}</b>
                        <span>
                          {m.key === 'full' && doneKeys.size > 0
                            ? `${FULL_SHEETS[firstUnwrittenIndex(doneKeys)].title}부터 이어서`
                            : MODE_DESCRIPTIONS[m.key]}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className={`${s.frame} ${s.raised}`}>
                <div
                  ref={paperRef}
                  className={s.paper}
                  onClick={() => inputRef.current?.focus()}
                >
                  <div className={s.head}>
                    어린 왕자
                    <b>{sheet.title}</b>
                  </div>
                  <div className={s.lines} aria-hidden>
                    {lines
                      .slice(firstVisible, firstVisible + VISIBLE_PAIRS)
                      .map((line, k) => {
                        const lineIndex = firstVisible + k;
                        const isCurrent = !result && lineIndex === currentLine;
                        const src: ReactNode[] = [];
                        const typed: ReactNode[] = [];
                        for (let i = line.start; i < line.end; i++) {
                          const ch = sheet.text[i];
                          src.push(
                            i < judge.settled ? (
                              <span key={i} className={s.done}>
                                {ch}
                              </span>
                            ) : (
                              ch
                            )
                          );
                          if (i < typedCount) {
                            const v = value[i];
                            typed.push(
                              i >= judge.settled ? (
                                <span key={i} className={s.composing}>
                                  {v}
                                </span>
                              ) : wrongSet.has(i) ? (
                                <span key={i} className={s.wrong}>
                                  {v}
                                </span>
                              ) : (
                                v
                              )
                            );
                          }
                        }
                        if (isCurrent && !composing)
                          typed.push(<span key='caret' className={s.caret} />);
                        return (
                          <div
                            key={lineIndex}
                            className={s.pair}
                            data-current={isCurrent}
                          >
                            <div className={s.src}>{src}</div>
                            <div className={s.typed}>{typed}</div>
                          </div>
                        );
                      })}
                  </div>
                  <textarea
                    ref={inputRef}
                    className={s.input}
                    value={value}
                    aria-label={`${sheet.title}. 다음 문장을 똑같이 입력하세요: ${sheet.text}`}
                    autoComplete='off'
                    autoCorrect='off'
                    autoCapitalize='off'
                    spellCheck={false}
                    disabled={!!result}
                    onChange={handleChange}
                    onCompositionStart={() => setComposing(true)}
                    onCompositionEnd={handleCompositionEnd}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault();
                    }}
                    // 붙여넣기·끌어 놓기는 막는다 — 랭킹 공정성
                    onPaste={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                  />
                </div>
              </div>
              {sheet.picture && (
                <PixelPicture name={sheet.picture} className={s.picture} />
              )}
            </div>
          )}

          <div className={s.side}>
            <div className={s.badge}>목표 300타</div>
            <div className={`${s.art} ${s.raised}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 150px 도트 그림, 픽셀 그대로 키워야 해서 최적화를 거치지 않는다 */}
              <img
                src={`/typing/kid-${face}.webp`}
                alt=''
                width={150}
                height={150}
              />
            </div>
            <div className={`${s.clock} ${s.raised}`}>
              <div className={s.clockLabel}>긴 글 필사</div>
              <div className={s.lcd} aria-label={`걸린 시간 ${clock(elapsed)}`}>
                {clock(elapsed)}
              </div>
              <div className={s.work}>어린 왕자</div>
              <div className={s.counter}>{sheet.counter}</div>
            </div>
          </div>
        </div>

        <div className={`${s.statusFrame} ${s.raised}`}>
          <div className={s.status} aria-live='off'>
            <span>
              {'타    수 : '}
              <span style={{ color: '#fff' }}>{cpm}타/분</span>
            </span>
            <div className={s.meter}>
              <i
                style={{
                  width: `${Math.min(100, (cpm / CPM_BAR_MAX) * 100)}%`,
                }}
              />
            </div>
            <span>
              {'정 확 도 : '}
              <span style={{ color: '#fff' }}>{accuracy} %</span>
            </span>
            <div className={s.meter} data-white>
              <i
                style={{
                  width: `${(typedCount / sheet.text.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className={s.footer}>
          <p className={s.hint}>{hint}</p>
          {started && (
            <button
              type='button'
              className={s.btn}
              onClick={() => {
                resetTyping();
                setFocusTick((n) => n + 1);
              }}
            >
              다 시
            </button>
          )}
        </div>
      </div>

      {result && (
        <div className={s.dialogBackdrop}>
          <div
            ref={dialogRef}
            tabIndex={-1}
            onKeyDown={(e) => {
              // 창 자체에 포커스가 있을 때만 Enter 로 넘긴다(버튼 위 Enter 는 그 버튼 몫).
              // 스페이스는 받지 않는다 — 마지막 글자 뒤 습관처럼 누른 띄어쓰기로 결과가 넘어가 버리지 않게.
              if (e.key === 'Enter' && e.target === e.currentTarget) {
                e.preventDefault();
                goNext();
              }
            }}
            className={`${s.dialog} ${s.raised}`}
            role='dialog'
            aria-modal='true'
            aria-labelledby='typing-result-title'
          >
            <div className={s.titlebar}>
              <span className={s.title} id='typing-result-title'>
                필사 결과
              </span>
            </div>
            <div className={s.dialogBody}>
              <div className={s.report}>
                <div className={s.reportText}>
                  <strong>{sheet.title} 끝까지 썼어요 ✍️</strong>
                  <span>평균타수</span>: {result.cpm}타
                  <br />
                  <span>정확도</span>: {result.accuracy}%
                  <br />
                  <span>필사시간</span>: {minutesSeconds(result.durationMs)}
                </div>
                <div className={s.reportFace}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
                  <img
                    src='/typing/kid-happy.webp'
                    alt=''
                    width={150}
                    height={150}
                  />
                </div>
              </div>
              <div className={s.saveNote} role='status'>
                {result.save === 'saving' && <p>기록을 남기는 중이에요…</p>}
                {result.save === 'error' && (
                  <p>{result.message ?? '기록을 저장하지 못했어요.'}</p>
                )}
                {result.save === 'saved' && (
                  <MemberRankNote
                    optIn={optIn}
                    accuracy={result.accuracy}
                    action={rankAction}
                    onTurnOn={turnOnRank}
                  />
                )}
                {result.save === 'guest' && (
                  <GuestRankForm
                    accuracy={result.accuracy}
                    nickname={nickname}
                    onNicknameChange={(v) => {
                      setNickname(v);
                      if (rankAction.status === 'error')
                        setRankAction({ status: 'idle' });
                    }}
                    action={rankAction}
                    onSubmit={submitGuestRank}
                    loginHref={loginHref}
                  />
                )}
              </div>
              <div className={s.dialogButtons}>
                <button
                  type='button'
                  className={`${s.btn} ${s.btnQuit}`}
                  onClick={closeToMenu}
                >
                  종 료
                </button>
                <button
                  type='button'
                  className={s.btn}
                  onClick={() => {
                    resetTyping();
                    setFocusTick((n) => n + 1);
                  }}
                >
                  다 시
                </button>
                <button
                  type='button'
                  className={`${s.btn} ${s.btnMain}`}
                  onClick={goNext}
                >
                  {mode === 'famous' ? '다음 문장' : '다음 쪽'} · Enter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** 회원 결과 창 — 이번 기록이 랭킹에 반영되는지 바로 알려 준다(HJ 2026-11-26: 참여 토글이 아래에 있어 모르겠다) */
const MemberRankNote = ({
  optIn,
  accuracy,
  action,
  onTurnOn,
}: {
  optIn: boolean;
  accuracy: number;
  action: RankAction;
  onTurnOn: () => void;
}) => {
  if (!optIn)
    return (
      <>
        <p>
          내 기록에 남겼어요. 지금은 <b>순위 참여가 꺼져 있어서</b> 랭킹에는
          보이지 않아요.
        </p>
        <div className={s.noteRow}>
          <span className={s.noteSub}>
            켜면 다른 사람에게는 닉네임 첫 글자만 보여요(책**).
          </span>
          <button
            type='button'
            className={`${s.btn} ${s.btnSmall}`}
            disabled={action.status === 'sending'}
            onClick={onTurnOn}
          >
            순위 참여 켜기
          </button>
        </div>
        {action.status === 'error' && (
          <p className={s.noteError}>{action.message}</p>
        )}
      </>
    );
  return (
    <p>
      {action.status === 'done'
        ? '순위 참여를 켰어요. '
        : '내 기록에 남겼어요. '}
      {accuracy >= SPEED_RANK_MIN_ACCURACY
        ? '꾸준함·타수 랭킹에 반영돼요.'
        : `꾸준함 랭킹에 반영돼요. 타수 랭킹은 정확도 ${SPEED_RANK_MIN_ACCURACY}% 이상일 때만 올라가요.`}
    </p>
  );
};

/** 비회원 결과 창 — 닉네임으로 타수 랭킹에 올리기(HJ 2026-11-26 A안) */
const GuestRankForm = ({
  accuracy,
  nickname,
  onNicknameChange,
  action,
  onSubmit,
  loginHref,
}: {
  accuracy: number;
  nickname: string;
  onNicknameChange: (value: string) => void;
  action: RankAction;
  onSubmit: () => void;
  loginHref: string;
}) => {
  // 로그인 권유는 버튼 줄 대신 안내 칸 안에 — 버튼이 네 개가 되면 줄이 깨진다
  const login = (
    <div className={s.noteRow}>
      <span className={s.noteSub}>
        로그인하면 진행도와 꾸준함 순위까지 쌓여요.
      </span>
      <Link
        href={loginHref}
        className={`${s.btn} ${s.btnSmall} ${s.btnLink} ${s.btnMain}`}
      >
        로그인하고 기록 남기기
      </Link>
    </div>
  );
  if (accuracy < SPEED_RANK_MIN_ACCURACY)
    return (
      <>
        <p>
          정확도 {SPEED_RANK_MIN_ACCURACY}% 이상이면 닉네임으로 타수 랭킹에 올릴
          수 있어요. 한 번 더 도전해 볼까요?
        </p>
        {login}
      </>
    );
  if (action.status === 'done')
    return (
      <>
        <p>
          <b>{nickname}</b> 님의 기록을 타수 랭킹에 올렸어요! 아래 랭킹에서
          확인해 보세요.
        </p>
        {login}
      </>
    );
  return (
    <>
      <form
        className={s.noteRow}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <label className={s.nickLabel}>
          <span>닉네임으로 타수 랭킹에 올리기</span>
          <input
            className={s.nickInput}
            value={nickname}
            onChange={(e) => onNicknameChange(e.target.value)}
            maxLength={GUEST_NICKNAME_MAX}
            placeholder='2~10자'
            autoComplete='nickname'
            enterKeyHint='send'
          />
        </label>
        <button
          type='submit'
          className={`${s.btn} ${s.btnSmall}`}
          disabled={action.status === 'sending'}
        >
          {action.status === 'sending' ? '올리는 중…' : '랭킹에 올리기'}
        </button>
      </form>
      {action.status === 'error' && (
        <p className={s.noteError}>{action.message}</p>
      )}
      {login}
    </>
  );
};
