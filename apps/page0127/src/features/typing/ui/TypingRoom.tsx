'use client';

import {
  type ChangeEvent,
  type CompositionEvent,
  type ReactNode,
  useEffect,
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
  strokesPerMinute,
} from '@/entities/typing';

import { recordTypingPageAction } from '../api/typingActions';
import { PixelPicture } from './PixelPicture';

import type { TypingSheet } from '@/entities/typing';

import s from './TypingRoom.module.css';

type Mode = 'full' | 'chapter' | 'famous';
type Face = 'base' | 'focus' | 'happy' | 'sad';

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
  { key: 'full', label: '전문 이어 쓰기' },
  { key: 'chapter', label: '장 고르기' },
  { key: 'famous', label: '명문장만' },
];

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
  initialDoneKeys,
  loginHref,
}: {
  memberId: string | null;
  initialDoneKeys: string[];
  loginHref: string;
}) => {
  const router = useRouter();
  const [doneKeys, setDoneKeys] = useState(() => new Set(initialDoneKeys));
  const [mode, setMode] = useState<Mode>('full');
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
  const paperRef = useRef<HTMLDivElement>(null);
  const [perLine, setPerLine] = useState(26);

  useEffect(() => {
    const el = paperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setPerLine(perLineFor(entry.contentRect.width))
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 시계 — 치기 시작해서 끝날 때까지만 돈다
  useEffect(() => {
    if (startedAt === null || result) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [startedAt, result]);

  const elapsed = startedAt === null ? 0 : (result?.durationMs ?? now - startedAt);
  const judge = judgeTyping(value, sheet.text, composing);
  const accuracy = seen.typed.size
    ? Math.round(((seen.typed.size - seen.missed.size) / seen.typed.size) * 100)
    : 100;
  const cpm = result?.cpm ?? strokesPerMinute(judge.correctStrokes, elapsed);
  const typedCount = Math.min(value.length, sheet.text.length);

  const lines = useMemo(
    () => splitLines(sheet.text, perLine),
    [sheet.text, perLine]
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

  const lastSettledWrong =
    judge.settled > 0 && wrongSet.has(judge.settled - 1);
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

  const goTo = (nextMode: Mode, index: number) => {
    setMode(nextMode);
    if (nextMode === 'famous') setFamousIndex(index);
    else setFullIndex(index);
    resetTyping();
    inputRef.current?.focus();
  };

  const goNext = () => {
    if (mode === 'famous')
      return goTo('famous', (famousIndex + 1) % FAMOUS_SHEETS.length);
    if (mode === 'full')
      return goTo('full', firstUnwrittenIndex(doneKeys, fullIndex + 1));
    return goTo('chapter', (fullIndex + 1) % FULL_SHEETS.length);
  };

  const chapterState = (no: number) => {
    const pages = FULL_SHEETS.filter((x) => x.chapter === no);
    const done = pages.filter((x) => doneKeys.has(x.key)).length;
    return done === pages.length ? 'full' : done > 0 ? 'half' : 'none';
  };

  const hint = result
    ? '끝까지 썼어요!'
    : startedAt === null
      ? '종이를 누르고 타이핑을 시작하면 시간이 재기 시작해요. Enter 없이 띄어쓰기만 맞추면 돼요.'
      : '틀린 글자는 빨간 칸으로 보여요. 지우고 다시 쳐도 돼요.';

  return (
    <div className={s.window}>
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
              aria-pressed={mode === m.key}
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
                          : `${no}장 (번역 중)`
                      }
                      onClick={() => {
                        const pages = FULL_SHEETS.map((x, i) => ({ x, i })).filter(
                          ({ x }) => x.chapter === no
                        );
                        const todo = pages.find(({ x }) => !doneKeys.has(x.key));
                        goTo('chapter', (todo ?? pages[0]).i);
                      }}
                    >
                      {state === 'full' ? '✓' : no}
                    </button>
                  );
                })}
              </div>
              <span>회색 칸은 번역 중이라 곧 공개돼요.</span>
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
        </div>

        <div className={s.main}>
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
          <button
            type='button'
            className={s.btn}
            onClick={() => {
              resetTyping();
              inputRef.current?.focus();
            }}
          >
            다 시
          </button>
        </div>
      </div>

      {result && (
        <div className={s.dialogBackdrop}>
          <div
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
                  <img src='/typing/kid-happy.webp' alt='' width={150} height={150} />
                </div>
              </div>
              <p className={s.saveNote} role='status'>
                {result.save === 'saving' && '기록을 남기는 중이에요…'}
                {result.save === 'saved' &&
                  '내 기록에 남겼어요. 진행도와 랭킹에 반영돼요.'}
                {result.save === 'error' &&
                  (result.message ?? '기록을 저장하지 못했어요.')}
                {result.save === 'guest' && (
                  <>
                    지금 쓴 기록은 남지 않아요.{' '}
                    <Link href={loginHref}>로그인하면</Link> 진행도와 랭킹에
                    기록이 쌓여요.
                  </>
                )}
              </p>
              <div className={s.dialogButtons}>
                <button
                  type='button'
                  className={s.btn}
                  onClick={() => {
                    resetTyping();
                    inputRef.current?.focus();
                  }}
                >
                  다 시
                </button>
                <button
                  type='button'
                  className={`${s.btn} ${s.btnMain}`}
                  onClick={goNext}
                  autoFocus
                >
                  {mode === 'famous' ? '다음 문장' : '다음 쪽'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
