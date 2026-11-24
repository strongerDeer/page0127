import ReactMarkdown, {
  type Components,
  type ExtraProps,
} from 'react-markdown';

import { parseChartBlock } from '../model/chartBlock';
import {
  AgeTableChart,
  BarChart,
  ChartError,
  ColumnChart,
  ShelfCompareChart,
  SingleStatChart,
  SlopeChart,
} from './StoryChart';

import type { MyRecordChart } from '../model/chartBlock';
import type { ReactNode } from 'react';

/**
 * 독후감 본문(마크다운) → 서비스 스타일. 공개 페이지(서버)와 어드민 미리보기(브라우저)가 같이 쓴다.
 * 훅이 없어 서버·클라이언트 어디서든 그려진다 — 미리보기가 실제 화면과 똑같아야 해서 한 곳에 둔다.
 *
 * 독후감은 일반 게시글처럼 읽혀야 해서 본문 글자를 크게, 줄 간격을 넉넉하게 둔다.
 * 한글은 단어 중간에서 끊기지 않게 break-keep.
 *
 * 보안: react-markdown 은 본문 속 HTML 태그를 그리지 않고 글자로 둔다(rehype-raw 를 안 쓴다).
 * 쓰는 사람이 운영자뿐이어도 <script> 가 공개 페이지에 섞일 길을 아예 두지 않는다.
 */
const components: Components = {
  // 본문 안 제목은 페이지 h1·섹션 h2 아래 단계로 맞춘다 — #, ## 모두 소제목(h3)
  h1: ({ children }) => (
    <h3 className='heading-2 mt-10 first:mt-0'>{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className='heading-2 mt-10 first:mt-0'>{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className='mt-8 text-lg font-semibold text-text-strong'>{children}</h4>
  ),
  p: ({ children }) => (
    <p className='mt-5 break-keep text-[17px] leading-[1.9] text-text-body first:mt-0'>
      {children}
    </p>
  ),
  blockquote: ({ children }) => (
    <blockquote className='mt-6 border-l-2 border-line pl-4 text-text-subtle [&>p]:mt-2 [&>p]:text-base'>
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul className='mt-5 list-disc space-y-1 pl-5 text-[17px] leading-[1.8] text-text-body'>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className='mt-5 list-decimal space-y-1 pl-5 text-[17px] leading-[1.8] text-text-body'>
      {children}
    </ol>
  ),
  a: ({ href, children }) => {
    const external = Boolean(href && /^https?:\/\//.test(href));
    return (
      <a
        href={href}
        className='text-primary underline underline-offset-2'
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  },
  strong: ({ children }) => (
    <strong className='font-semibold text-text-strong'>{children}</strong>
  ),
  hr: () => <hr className='my-10 border-line' />,
};

/** 본문에 그림은 넣지 않는다 — 그림은 관계도·카드 칸으로 올린다(크기·alt 를 관리할 수 있게) */
const DISALLOWED = ['img'];

/** ```chart 코드 블록이면 그 안의 글자, 아니면 null */
const chartSource = (node: ExtraProps['node']): string | null => {
  const code = node?.children[0];
  if (code?.type !== 'element' || code.tagName !== 'code') return null;
  const className = code.properties.className;
  const classes = Array.isArray(className) ? className : [];
  if (!classes.includes('language-chart')) return null;
  return code.children
    .map((child) => (child.type === 'text' ? child.value : ''))
    .join('');
};

type StoryMarkdownProps = {
  body: string;
  /** 어드민 미리보기 — 틀린 차트 블록의 이유를 보여 준다(공개 페이지는 조용히 건너뛴다) */
  preview?: boolean;
  /**
   * 내 기록 블록(type: my-record)을 그릴 컴포넌트.
   *
   * 왜 밖에서 받나: 내 기록은 로그인을 확인하고 API 를 부르는 브라우저 컴포넌트라 features 층에 있다.
   * entities 가 features 를 import 하면 FSD 규칙(아래 층은 위 층을 모른다)이 깨지므로,
   * 페이지(app)가 끼워 넣는다 — "의존성 주입". 안 넘기면 그 블록은 그리지 않는다.
   */
  renderMyRecord?: (spec: MyRecordChart) => ReactNode;
};

/**
 * 본문 마크다운 → 서비스 스타일 + 차트 블록.
 *
 * 차트는 ```chart 코드 블록으로 적는다(문법: model/chartBlock.ts). react-markdown 은 코드 블록을
 * pre > code.language-chart 로 넘겨 주므로, pre 를 갈아 끼워 그 자리에 차트를 그린다.
 * 다른 언어의 코드 블록은 평범한 코드로 둔다.
 */
export const StoryMarkdown = ({
  body,
  preview = false,
  renderMyRecord,
}: StoryMarkdownProps) => {
  const withCharts: Components = {
    ...components,
    pre: ({ node, children }) => {
      const source = chartSource(node);
      if (source === null)
        return (
          <pre className='mt-5 overflow-x-auto rounded-lg bg-muted p-4 text-sm'>
            {children}
          </pre>
        );

      const result = parseChartBlock(source);
      if (!result.ok)
        return preview ? <ChartError message={result.error} /> : null;

      const { spec } = result;
      switch (spec.type) {
        case 'number':
        case 'people':
          return <SingleStatChart spec={spec} />;
        case 'bar':
          return <BarChart spec={spec} />;
        case 'column':
          return <ColumnChart spec={spec} />;
        case 'slope':
          return <SlopeChart spec={spec} />;
        case 'shelf':
          return <ShelfCompareChart spec={spec} />;
        case 'age-table':
          return <AgeTableChart spec={spec} />;
        case 'my-record':
          return renderMyRecord ? (
            <div className='mt-8'>{renderMyRecord(spec)}</div>
          ) : null;
      }
    },
  };

  return (
    <ReactMarkdown components={withCharts} disallowedElements={DISALLOWED}>
      {body}
    </ReactMarkdown>
  );
};
