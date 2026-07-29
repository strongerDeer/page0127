import {
  BellOff,
  CircleAlert,
  Eye,
  type LucideIcon,
  Moon,
  ScrollText,
} from 'lucide-react';

import { ErrorCard } from './ErrorCard';

import type { SentryFailure, SentryIssuesResult } from '../api/getSentryIssues';
import type { Grade } from '../lib/triage';

const TOKEN_DOC = 'https://sentry.io/settings/account/api/auth-tokens/';

const FAILURE_TEXT: Record<SentryFailure['kind'], string> = {
  'no-token': 'Sentry 토큰이 설정되지 않았습니다. SENTRY_ISSUES_TOKEN을 등록해주세요.',
  forbidden: '토큰 권한이 모자랍니다. event:read와 project:read가 필요합니다.',
  error: 'Sentry 연결에 실패했습니다. 잠시 후 다시 시도해주세요.',
};

// 화면에 보여줄 순서와 제목. 이모지 대신 lucide 단색 아이콘을 쓴다(AdminNav와 같은 규칙).
const SECTIONS: {
  grade: Grade;
  title: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  {
    grade: 'urgent',
    title: '지금 고치세요',
    hint: '최근 발생했거나 계속 이어지는 오류',
    icon: CircleAlert,
    tone: 'text-red-600',
  },
  {
    grade: 'watch',
    title: '지켜보세요',
    hint: '드물게 발생 중',
    icon: Eye,
    tone: 'text-amber-600',
  },
  {
    grade: 'quiet',
    title: '잠잠해짐',
    hint: '7일 넘게 조용합니다. 고쳤다면 Sentry에서 Resolve 하세요',
    icon: Moon,
    tone: 'text-text-subtle',
  },
  {
    grade: 'log',
    title: '로그성',
    hint: 'console.error로 남긴 기록. 크래시가 아닙니다',
    icon: ScrollText,
    tone: 'text-text-subtle',
  },
  {
    grade: 'noise',
    title: '무시해도 되는 것',
    hint: '브라우저 잡음·확장 프로그램·정상 제어 흐름',
    icon: BellOff,
    tone: 'text-text-subtle',
  },
];

export const ErrorList = ({ result, now }: { result: SentryIssuesResult; now: Date }) => {
  if (!result.ok) {
    return (
      <div className='rounded-lg border border-line p-4 text-sm'>
        <p>{FAILURE_TEXT[result.failure.kind]}</p>
        {result.failure.kind === 'no-token' && (
          <a
            href={TOKEN_DOC}
            target='_blank'
            rel='noreferrer'
            className='mt-2 inline-block underline'
          >
            토큰 발급하러 가기
          </a>
        )}
      </div>
    );
  }

  if (result.issues.length === 0) {
    return <p className='text-sm text-text-subtle'>운영 환경에 확인할 오류가 없습니다.</p>;
  }

  return (
    <div className='space-y-6'>
      {SECTIONS.map(({ grade, title, hint, icon: Icon, tone }) => {
        const items = result.issues.filter((i) => i.grade === grade);
        if (items.length === 0) return null;

        const label = (
          <>
            <Icon className={`h-4 w-4 ${tone}`} aria-hidden />
            {title} ({items.length})
          </>
        );

        const body = (
          <ul className='mt-2 space-y-2'>
            {items.map((issue) => (
              <ErrorCard key={issue.id} issue={issue} now={now} />
            ))}
          </ul>
        );

        // 로그성·노이즈는 평소에 시야를 가리지 않도록 접어둔다.
        if (grade === 'log' || grade === 'noise') {
          return (
            <details key={grade}>
              {/* summary 자체에 flex를 주면 펼침 삼각형 마커가 사라진다. 안쪽 span으로 정렬한다 */}
              <summary className='cursor-pointer text-sm font-medium'>
                <span className='inline-flex items-center gap-2 align-middle'>{label}</span>
              </summary>
              <p className='mt-1 text-xs text-text-subtle'>{hint}</p>
              {body}
            </details>
          );
        }

        return (
          <section key={grade}>
            <h2 className='flex items-center gap-2 text-sm font-medium'>{label}</h2>
            <p className='mt-1 text-xs text-text-subtle'>{hint}</p>
            {body}
          </section>
        );
      })}
    </div>
  );
};
