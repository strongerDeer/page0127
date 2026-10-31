'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { type Book, fillMissingSpine } from '@/entities/book';

import {
  pickSpineRepairTargets,
  pruneSpineRepairLog,
  type SpineRepairLog,
} from './spineRepair';

const STORAGE_KEY = 'page0127:spine-repair';

/** 첫 화면 이미지와 다투지 않게 조금 기다렸다가 시작한다 */
const START_DELAY_MS = 3000;

const readLog = (): SpineRepairLog => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SpineRepairLog) : {};
  } catch {
    return {};
  }
};

const writeLog = (log: SpineRepairLog) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // 시크릿 모드 등 — 기록을 못 남기면 다음에 한 번 더 확인할 뿐이다
  }
};

/**
 * 내 서재를 열면, 책등이 비어 있는 책을 뒤에서 다시 확인해 채운다.
 *
 * 왜 필요한가: 등록 직후 책등 확인은 브라우저에서 하는데, 폰에서는 데이터가 느리거나
 * 등록하자마자 앱을 내리면 확인이 끝나지 못해 책등 없이 저장됐다(베타 사용자 사례,
 * 2026-10-31). 등록 순간 한 번만 보지 않고, 주인이 서재를 열 때 한 번 더 본다.
 *
 * 화면에는 아무것도 띄우지 않는다. 채운 책이 있으면 조용히 새로 불러와
 * 글자 책등이 실제 책등 이미지로 바뀐다.
 */
export const useRepairMissingSpines = (books: Book[], enabled: boolean) => {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      const now = Date.now();
      const log = pruneSpineRepairLog(readLog(), now);
      const targets = pickSpineRepairTargets(books, log, now);
      if (targets.length === 0) return;

      // 한 권씩 — 폰 데이터에서 1200px 이미지 여러 장을 한꺼번에 받지 않는다
      let filled = 0;
      for (const book of targets) {
        if (cancelled) return;
        if (await fillMissingSpine(book)) filled += 1;
        else log[book.id] = Date.now();
      }
      writeLog(log);
      if (filled > 0 && !cancelled) router.refresh();
    }, START_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // 같은 서재를 다시 그릴 때마다 돌지 않게 — 주인 여부가 정해졌을 때 한 번
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
};
