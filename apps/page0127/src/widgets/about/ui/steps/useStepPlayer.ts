'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  nextStep,
  STEP_DURATION_MS,
  type StepIndex,
} from '../../model/stepFrame';

/**
 * 세 걸음 자동 재생.
 *
 * WCAG 2.2.2 — 5초 넘게 스스로 바뀌는 콘텐츠는 멈출 수 있어야 한다:
 * 버튼으로 멈추고, 사용자가 단계를 직접 고르면 다시는 저절로 넘기지 않는다.
 * 마우스 오버로는 멈추지 않는다 — 보는 동안 마우스는 대개 그 위에 있어서
 * '보고 있을 때 재생이 안 되는' 상태가 된다(시안에서 실제로 겪음).
 * 키보드 포커스가 들어와 있는 동안(setHold)만 잠시 멈춘다.
 */
export const useStepPlayer = (
  panelRef: React.RefObject<HTMLElement | null>
) => {
  const [step, setStep] = useState<StepIndex>(0);
  // 첫 렌더(서버 HTML)는 완성 화면 — 재생이 시작되면 0부터 그린다
  const [local, setLocal] = useState(1);
  const [playing, setPlaying] = useState(false);
  const hold = useRef(false);
  const visible = useRef(false);
  const t0 = useRef(0);
  const elapsed = useRef(0);

  // 움직임 줄이기면 시작조차 하지 않는다 — 처음부터 완성 화면.
  // 이 설정은 브라우저에서만 알 수 있어 초기값으로 못 준다(서버 HTML 과 어긋난다) —
  // 마운트 직후 한 번만 켠다.
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 위 사유
    setPlaying(true);
  }, []);

  // 처음 화면에 들어올 때 1단계부터 — 안 보이는 동안 혼자 진행되지 않게
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    let seen = false;
    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = e.isIntersecting;
        if (e.isIntersecting && !seen) {
          seen = true;
          elapsed.current = 0;
          t0.current = performance.now();
          setStep(0);
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [panelRef]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    t0.current = performance.now() - elapsed.current;
    const tick = (now: number) => {
      if (!visible.current || hold.current) {
        // 멈춰 있는 동안은 시간이 흐르지 않은 것으로 친다
        t0.current = now - elapsed.current;
      } else {
        elapsed.current = now - t0.current;
        const t = Math.min(1, elapsed.current / STEP_DURATION_MS);
        setLocal(t);
        if (t >= 1) {
          setStep((s) => nextStep(s));
          elapsed.current = 0;
          t0.current = now;
          setLocal(0);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  /** 사용자가 직접 고른다 — 자동 재생을 끄고 완성된 화면을 보여 준다 */
  const choose = useCallback((n: StepIndex) => {
    setPlaying(false);
    setStep(n);
    setLocal(1);
  }, []);

  // 상태 업데이트 함수 안에서 다른 상태를 바꾸지 않는다 — StrictMode 가 두 번 부른다
  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
      setLocal(1); // 멈출 땐 빈 별·빈 메모가 남지 않게 완성 상태로
    } else {
      elapsed.current = 0;
      setLocal(0);
      setPlaying(true);
    }
  }, [playing]);

  const setHold = useCallback((v: boolean) => {
    hold.current = v;
  }, []);

  return { step, local, playing, choose, togglePlay, setHold };
};
