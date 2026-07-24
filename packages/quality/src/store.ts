import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { mergeFieldHistory } from './crux.ts';

import type {
  FieldHistory,
  FieldHistoryFile,
  QualityHistory,
  QualityRecord,
} from './types';

export const readHistory = (path: string): QualityHistory => {
  if (!existsSync(path)) {
    return { schemaVersion: 1, history: [] };
  }
  return JSON.parse(readFileSync(path, 'utf8')) as QualityHistory;
};

export const appendRecord = (path: string, record: QualityRecord): void => {
  const data = readHistory(path);
  data.history.push(record);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
};

// ── 필드 추세 저장소 ──────────────────────────────────────────────────────
// 주간 레코드(append)와 달리 시계열은 upsert 병합이라 파일을 분리한다.
// History API가 매번 최근 25주를 통째로 주므로 레코드마다 넣으면 25배 중복이 된다.

export const readFieldHistory = (path: string): FieldHistoryFile => {
  if (!existsSync(path)) return { schemaVersion: 1, apps: {} };
  return JSON.parse(readFileSync(path, 'utf8')) as FieldHistoryFile;
};

/** 앱의 시계열을 기존 파일과 병합해 저장한다. 25주 롤링 윈도 밖 과거를 보존한다. */
export const saveFieldHistory = (
  path: string,
  app: string,
  next: FieldHistory
): void => {
  const file = readFieldHistory(path);
  file.apps[app] = mergeFieldHistory(file.apps[app], next);
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);
};
