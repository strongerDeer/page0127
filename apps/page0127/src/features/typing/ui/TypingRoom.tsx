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

import { useRouter } from 'next/navigation';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import {
  accuracyOf,
  chapterPagesOf,
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
  finishTypingAction,
  startTypingAction,
  submitGuestTypingAction,
} from '../api/guestTypingActions';
import {
  recordTypingPageAction,
  setTypingRankOptInAction,
} from '../api/typingActions';
import { isAssistedInput } from '../lib/assistedInput';
import {
  GUEST_NICKNAME_MAX,
  validateGuestNickname,
} from '../model/guestNickname';
import { placeFor } from '../model/rankRows';
import { PixelPicture } from './PixelPicture';
import { RetroListDialog, RetroListPanel } from './RetroListDialog';

import type { RankPlace } from '../model/rankRows';
import type { TypingRankRow, TypingSheet } from '@/entities/typing';

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
  /** 친 글 — 비회원이 결과 창에서 올릴 때 서버가 정확도를 다시 센다 */
  typed: string;
  /** 자동 입력 흔적(가짜 이벤트·한 번에 여러 글자) — 랭킹엔 올리지 않는다 */
  assisted: boolean;
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
  famous: `명문장 ${FAMOUS_SHEETS.length}개를 짧게 한 대목씩`,
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
  speedRanking,
}: {
  memberId: string | null;
  /** 회원의 순위 참여 여부 — 결과 창에서 "랭킹에 반영되는지"를 바로 알려 준다 */
  rankOptIn: boolean;
  initialDoneKeys: string[];
  /** 타수 랭킹(상위 100) — 결과 창에서 "지금 기록이면 몇 위"를 바로 계산한다 */
  speedRanking: TypingRankRow[];
}) => {
  const router = useRouter();
  // 처음엔 방식 고르는 시작 화면. 하나를 고르면 바로 친다(HJ 2026-11-26)
  const [started, setStarted] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  const [optIn, setOptIn] = useState(rankOptIn);
  // 순위 참여는 랭킹 카드와 필사 창 두 곳에서 켤 수 있다 → 한쪽에서 바꾸면 router.refresh 로 새 값이 내려온다.
  // useState 첫 값만 쓰면 그 새 값을 못 받아 "켜져 있는데 결과 창은 꺼짐"이 된다(HJ 2026-11-26) → 받은 값이 바뀌면 맞춘다
  const [syncedOptIn, setSyncedOptIn] = useState(rankOptIn);
  if (rankOptIn !== syncedOptIn) {
    setSyncedOptIn(rankOptIn);
    setOptIn(rankOptIn);
  }
  const [rankAction, setRankAction] = useState<RankAction>({
    status: 'idle',
  });
  const [nickname, setNickname] = useState('');
  // 시간 토큰(회원·비회원) — 첫 글자에 시작 토큰, 마지막 글자에 끝 토큰을 서버가 서명해 준다.
  // 서버가 "첫 글자 ~ 마지막 글자"를 직접 재서 타수를 확인한다. 화면에 그리지 않으므로 ref, 응답을 기다리는 Promise 로 둔다
  const tokenRef = useRef<{
    key: string;
    token: Promise<string | null>;
  } | null>(null);
  // 이번 쪽에서 자동 입력 흔적이 있었는가(HJ 2026-11-26 B안)
  const assistedRef = useRef(false);
  // 시작 팝업 단계 — 방식 → 명문장·장 목록
  const [startStep, setStartStep] = useState<'mode' | 'famous' | 'chapter'>(
    'mode'
  );
  const [startModeIndex, setStartModeIndex] = useState(0);

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
  const accuracy = accuracyOf(judge);
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
    setResult(null);
    setRankAction({ status: 'idle' });
    tokenRef.current = null;
    assistedRef.current = false;
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
    const ticket = tokenRef.current;
    if (!ticket || ticket.key !== sheet.key) {
      setRankAction({
        status: 'error',
        message: '시작 기록이 없어요. 다시 쳐 주세요.',
      });
      return;
    }
    setRankAction({ status: 'sending' });
    startSaving(async () => {
      const token = await ticket.token;
      if (!token) {
        setRankAction({
          status: 'error',
          message: '기록을 확인하지 못했어요. 다시 쳐 주세요.',
        });
        return;
      }
      const res = await submitGuestTypingAction({
        token,
        pageKey: ticket.key,
        nickname: check.nickname,
        typed: result.typed,
        cpm: result.cpm,
        assisted: result.assisted,
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
      trackEvent('typing_rank_join', { member: false });
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
      trackEvent('typing_rank_join', { member: true });
      router.refresh();
    });
  };

  /** at·from 은 이벤트 핸들러에서 잰 시각 — 렌더 중에 Date.now() 를 부르지 않는다 */
  const finish = (finalValue: string, at: number, from: number) => {
    const durationMs = Math.max(1000, at - from);
    const finalJudge = judgeTyping(finalValue, sheet.text, false);
    const finalAccuracy = accuracyOf(finalJudge);
    const finalCpm = strokesPerMinute(finalJudge.correctStrokes, durationMs);
    const assisted = assistedRef.current;
    const base = {
      cpm: finalCpm,
      accuracy: finalAccuracy,
      durationMs,
      typed: finalValue,
      assisted,
    };

    // 마지막 글자 순간을 서버에 찍어 둔다(결과 창에서 머무는 시간은 필사 시간이 아니다)
    const ticket =
      tokenRef.current?.key === sheet.key ? tokenRef.current : null;
    const finished = ticket
      ? ticket.token
          .then((t) =>
            t
              ? finishTypingAction(t).then((r) => (r.ok ? r.token : null))
              : null
          )
          .catch(() => null)
      : Promise.resolve(null);
    if (ticket) tokenRef.current = { key: ticket.key, token: finished };

    // GA — 친 문장·닉네임은 보내지 않는다(숫자와 방식만)
    const member = Boolean(memberId);
    trackEvent('typing_page_complete', {
      mode,
      chapter: sheet.chapter ?? undefined,
      cpm: finalCpm,
      accuracy: finalAccuracy,
      assisted,
      member,
    });
    // 비회원은 진행도가 없으니 "장의 마지막 쪽을 끝냈다"로 장 완료를 센다
    if (!member && sheet.chapter !== null && mode !== 'famous') {
      const chapterSheets = FULL_SHEETS.filter(
        (x) => x.chapter === sheet.chapter
      );
      if (chapterSheets.at(-1)?.key === sheet.key)
        trackEvent('typing_chapter_complete', {
          chapter: sheet.chapter,
          member,
        });
    }

    if (!memberId) {
      setResult({ ...base, save: 'guest' });
      return;
    }
    setResult({ ...base, save: 'saving' });
    const key = sheet.key;
    startSaving(async () => {
      const saved = await recordTypingPageAction({
        pageKey: key,
        token: await finished,
        typed: finalValue,
        cpm: finalCpm,
        durationMs,
        assisted,
      });
      if (saved.ok) {
        // 회원은 이번 쪽으로 그 장의 모든 쪽이 채워진 순간을 장 완료로 센다(다시 쓴 장은 세지 않는다)
        const chapter = sheet.chapter;
        if (chapter !== null && !doneKeys.has(key)) {
          const after = chapterPagesOf(chapter, new Set(doneKeys).add(key));
          if (after.done === after.total)
            trackEvent('typing_chapter_complete', { chapter, member: true });
        }
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

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (result) return;
    const next = e.target.value.replace(/\n/g, '').slice(0, sheet.text.length);
    const t = Date.now();
    if (startedAt === null && next.length > 0) {
      setStartedAt(t);
      setNow(t);
      // 첫 글자 순간을 서버에 찍어 둔다(회원·비회원 모두 — 서버가 타수를 확인한다)
      const key = sheet.key;
      tokenRef.current = {
        key,
        token: startTypingAction(key)
          .then((r) => (r.ok ? r.token : null))
          .catch(() => null),
      };
    }
    const isComposing =
      (e.nativeEvent as InputEvent).isComposing === true || composing;
    // 자동 입력 흔적 — 스크립트가 만든 이벤트이거나 조합 없이 한 번에 여러 글자가 들어왔다
    if (
      isAssistedInput({
        trusted: e.nativeEvent.isTrusted,
        composing: isComposing,
        added: next.length - value.length,
      })
    )
      assistedRef.current = true;
    setValue(next);
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

  /** 시작 창에서 방식을 골라 들어갔다 — 시작 창에서 고를 때마다(탭 전환·다음 쪽은 세지 않는다) */
  const trackStart = (startMode: Mode) =>
    trackEvent('typing_start', { mode: startMode, member: Boolean(memberId) });

  /** 장을 고르면 그 장에서 아직 안 쓴 첫 쪽으로(다 썼으면 첫 쪽) */
  const pickChapter = (no: number) => {
    const pages = FULL_SHEETS.map((x, i) => ({ x, i })).filter(
      ({ x }) => x.chapter === no
    );
    if (pages.length === 0) return;
    const todo = pages.find(({ x }) => !doneKeys.has(x.key));
    goTo('chapter', (todo ?? pages[0]).i);
  };

  // 지금 쓰는 장의 다 쓴 쪽 수 — 오른쪽 칸·결과 창에서 "몇 쪽 남았나"를 보여 준다.
  // 진행도는 회원만 남으므로 비회원에게는 보이지 않는다(늘 0쪽이라 헷갈린다)
  const sheetChapter =
    memberId && mode === 'full' && sheet.chapter !== null
      ? chapterPagesOf(sheet.chapter, doneKeys)
      : null;

  /** 목록 창에 넣을 장·명문장 줄 */
  const chapterItems = Array.from(
    { length: LITTLE_PRINCE_TOTAL_CHAPTERS },
    (_, i) => i + 1
  ).map((no) => {
    const open = OPEN_CHAPTERS.includes(no);
    return {
      key: String(no),
      label: `${no}장`,
      disabled: !open,
      // 장마다 다 쓴 쪽 수(HJ 2026-11-26) — 다 쓴 장은 ✓
      note: !open
        ? '준비 중'
        : memberId
          ? chapterNote(chapterPagesOf(no, doneKeys))
          : undefined,
    };
  });
  const famousItems = FAMOUS_SHEETS.map((f) => ({
    key: f.key,
    label: f.title.replace('명문장 · ', ''),
    note: doneKeys.has(f.key) ? '✓' : undefined,
  }));

  const hint = !started
    ? '목록에서 고르고 「시작」을 누르면 필사가 시작돼요.'
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
        {/* 탭은 시작한 뒤에만 — 시작 전엔 팝업 하나에서만 고른다(HJ 2026-11-26) */}
        {started && (
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
        )}

        {started && (
          <div className={s.sub}>
            {mode === 'full' && (
              <span>
                이어서 쓰는 곳: <b>{sheet.title}</b> · 다 쓰면 다음 쪽으로
                넘어가요
              </span>
            )}
            {/* 장·명문장은 긴 칩 줄 대신 목록 창 단추 하나(HJ 2026-11-26 A안) */}
            {mode === 'chapter' && (
              <RetroListDialog
                title='장 고르기'
                value={(sheet.chapter ?? 1) - 1}
                onPick={(i) => pickChapter(i + 1)}
                items={chapterItems}
              />
            )}
            {mode === 'famous' && (
              <RetroListDialog
                title='명문장 고르기'
                value={famousIndex}
                onPick={(i) => goTo('famous', i)}
                items={famousItems}
              />
            )}
          </div>
        )}

        <div className={s.main} data-started={started}>
          {!started ? (
            <div className={`${s.frame} ${s.raised}`}>
              {/* 시작 화면 — 옛 타자 프로그램처럼 목록 창이 떠 있는 상태에서 방식을 고른다(HJ 2026-11-26) */}
              <div className={`${s.paper} ${s.menuPaper}`}>
                {/* 방식 → (명문장·장이면) 같은 팝업에서 대목·장까지 고르고 바로 시작(HJ 2026-11-26 A안) */}
                {startStep === 'mode' && (
                  <RetroListPanel
                    key='mode'
                    className={s.startPanel}
                    title='필사 방식 고르기'
                    // 전문은 다음 단계 없이 바로 시작이라 단추 이름도 "시작"
                    confirmLabelFor={(i) =>
                      MODES[i].key === 'full' ? '시작' : '다음'
                    }
                    initial={startModeIndex}
                    items={MODES.map((m) => ({
                      key: m.key,
                      label: m.label,
                      desc:
                        m.key === 'full' && doneKeys.size > 0
                          ? `${FULL_SHEETS[firstUnwrittenIndex(doneKeys)].title}부터 이어서`
                          : MODE_DESCRIPTIONS[m.key],
                    }))}
                    onConfirm={(i) => {
                      const key = MODES[i].key;
                      setStartModeIndex(i);
                      if (key === 'full') {
                        trackStart('full');
                        goTo('full', firstUnwrittenIndex(doneKeys));
                      } else setStartStep(key);
                    }}
                  />
                )}
                {startStep === 'famous' && (
                  <RetroListPanel
                    key='famous'
                    className={s.startPanel}
                    title='명문장 고르기'
                    confirmLabel='시작'
                    cancelLabel='이전'
                    autoFocus
                    initial={0}
                    items={famousItems}
                    onCancel={() => setStartStep('mode')}
                    onConfirm={(i) => {
                      trackStart('famous');
                      goTo('famous', i);
                    }}
                  />
                )}
                {startStep === 'chapter' && (
                  <RetroListPanel
                    key='chapter'
                    className={s.startPanel}
                    title='장 고르기'
                    confirmLabel='시작'
                    cancelLabel='이전'
                    autoFocus
                    initial={
                      (FULL_SHEETS[firstUnwrittenIndex(doneKeys)].chapter ??
                        1) - 1
                    }
                    items={chapterItems}
                    onCancel={() => setStartStep('mode')}
                    onConfirm={(i) => {
                      trackStart('chapter');
                      pickChapter(i + 1);
                    }}
                  />
                )}
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
              {sheetChapter && (
                <div className={s.chapterDone}>
                  {sheetChapter.done === sheetChapter.total ? '✓ ' : ''}
                  {sheet.chapter}장 다 쓴 쪽 {sheetChapter.done}/
                  {sheetChapter.total}
                </div>
              )}
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
                  <strong>
                    {sheet.title} 끝까지 썼어요 ✍️
                    {sheetChapter &&
                      sheetChapter.done === sheetChapter.total && (
                        <span className={s.chapterClear}>
                          {sheet.chapter}장을 다 썼어요! 🎉
                        </span>
                      )}
                  </strong>
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
                {/* 자동 입력 흔적이 있으면 순위 안내 대신 한 줄만(HJ 2026-11-26 B안) */}
                {result.assisted &&
                  (result.save === 'saved' || result.save === 'guest') && (
                    <p>자동 입력이 있어 이번 기록은 랭킹에 안 올라가요.</p>
                  )}
                {result.save === 'saved' && !result.assisted && (
                  <MemberRankNote
                    optIn={optIn}
                    accuracy={result.accuracy}
                    place={placeFor(speedRanking, result.cpm)}
                    myBest={speedRanking.find((r) => r.isMe)?.value ?? null}
                    cpm={result.cpm}
                    action={rankAction}
                    onTurnOn={turnOnRank}
                  />
                )}
                {result.save === 'guest' && !result.assisted && (
                  <GuestRankForm
                    accuracy={result.accuracy}
                    place={placeFor(speedRanking, result.cpm)}
                    myBest={speedRanking.find((r) => r.isMe)?.value ?? null}
                    cpm={result.cpm}
                    nickname={nickname}
                    onNicknameChange={(v) => {
                      setNickname(v);
                      if (rankAction.status === 'error')
                        setRankAction({ status: 'idle' });
                    }}
                    action={rankAction}
                    onSubmit={submitGuestRank}
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
  place,
  myBest,
  cpm,
  action,
  onTurnOn,
}: {
  optIn: boolean;
  accuracy: number;
  place: RankPlace;
  /** 타수 랭킹에 이미 있는 내 최고 타수 — 이번 기록이 그보다 낮으면 순위는 그대로다 */
  myBest: number | null;
  cpm: number;
  action: RankAction;
  onTurnOn: () => void;
}) => {
  // 안내는 짧게 한 줄(HJ 2026-11-26 "내용 좀 간단하게")
  const qualifies = accuracy >= SPEED_RANK_MIN_ACCURACY;
  // 이번 기록으로 순위가 바뀌는 경우에만 "몇 위"를 말한다
  const newBest = myBest === null || cpm > myBest;
  if (!optIn)
    return (
      <>
        <div className={s.noteRow}>
          <span>
            {qualifies && place.rank !== null ? (
              <>
                순위 참여를 켜면 <b>{place.rank}위</b>예요!
              </>
            ) : (
              '기록을 남겼어요. 순위 참여는 꺼져 있어요.'
            )}
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
      {!qualifies ? (
        <RankChase place={place} />
      ) : newBest && place.rank !== null ? (
        <RankNow place={place} />
      ) : !newBest && myBest !== null ? (
        <BestKept best={myBest} />
      ) : (
        '기록을 남겼어요.'
      )}
    </p>
  );
};

/** 비회원 결과 창 — 닉네임으로 타수 랭킹에 올리기(HJ 2026-11-26 A안, 안내는 짧게) */
const GuestRankForm = ({
  accuracy,
  place,
  myBest,
  cpm,
  nickname,
  onNicknameChange,
  action,
  onSubmit,
}: {
  accuracy: number;
  place: RankPlace;
  /** 이 브라우저(비회원 쿠키)로 이미 올린 최고 타수 */
  myBest: number | null;
  cpm: number;
  nickname: string;
  onNicknameChange: (value: string) => void;
  action: RankAction;
  onSubmit: () => void;
}) => {
  // 안내 문구는 최소로 — 로그인 권유는 머리글 로그인 단추가 맡는다(HJ 2026-11-26 "텍스트가 너무 많아")
  if (accuracy < SPEED_RANK_MIN_ACCURACY)
    return (
      <>
        <p>
          <RankChase place={place} />
        </p>
      </>
    );
  if (action.status === 'done')
    return (
      <>
        <p>
          <b>{nickname}</b> 님,{' '}
          {place.rank !== null ? <b>{place.rank}위</b> : '랭킹'}에 올랐어요! 🎉
        </p>
      </>
    );
  // 랭킹엔 한 사람당 최고 기록만 보이므로, 최고 기록을 넘겼을 때만 이름 올리기를 권한다(HJ 2026-11-26)
  if (myBest !== null && cpm <= myBest)
    return (
      <p>
        <BestKept best={myBest} />
      </p>
    );
  return (
    <>
      <p>
        <RankNow place={place} />
      </p>
      <form
        className={s.noteRow}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <input
          className={s.nickInput}
          aria-label='닉네임으로 타수 랭킹에 올리기'
          value={nickname}
          onChange={(e) => onNicknameChange(e.target.value)}
          maxLength={GUEST_NICKNAME_MAX}
          placeholder='닉네임 2~10자'
          autoComplete='nickname'
          enterKeyHint='send'
        />
        <button
          type='submit'
          className={`${s.btn} ${s.btnSmall}`}
          disabled={action.status === 'sending'}
        >
          {action.status === 'sending' ? '올리는 중…' : '이름 올리기'}
        </button>
      </form>
      {action.status === 'error' && (
        <p className={s.noteError}>{action.message}</p>
      )}
    </>
  );
};

/** 최고 기록을 못 넘긴 기록 — 랭킹엔 최고 기록만 보인다는 것과 넘길 목표를 함께 */
const BestKept = ({ best }: { best: number }) => (
  <>
    랭킹엔 최고 기록만 보여요. <b>{best}타</b>를 넘기면 순위가 올라가요!
  </>
);

/** "지금 기록이면 3위! (바로 위까지 14타)" — 순위를 모르면 그냥 올리기를 권한다 */
const RankNow = ({ place }: { place: RankPlace }) =>
  place.rank === null ? (
    <>타수 랭킹에 이름을 올려 보세요!</>
  ) : (
    <>
      🏆 지금 기록이면 <b>{place.rank}위</b>!
      {place.gapToNext !== null && ` (바로 위까지 ${place.gapToNext}타)`}
    </>
  );

/** 정확도가 모자란 기록에 "이것만 넘기면 몇 위" — 다시 도전할 이유를 준다 */
const RankChase = ({ place }: { place: RankPlace }) =>
  place.rank === null ? (
    <>
      정확도 {SPEED_RANK_MIN_ACCURACY}%를 넘기면 타수 랭킹에 올라요. 한 번 더?
    </>
  ) : (
    <>
      정확도 {SPEED_RANK_MIN_ACCURACY}%만 넘기면 <b>{place.rank}위</b>! 한 번
      더?
    </>
  );

/** 장 고르기 목록 줄 오른쪽 — "2/5쪽", 다 쓴 장은 "✓ 5/5쪽" */
const chapterNote = ({ done, total }: { done: number; total: number }) =>
  done === total ? `✓ ${done}/${total}쪽` : `${done}/${total}쪽`;
