import ReactMarkdown, { type Components } from 'react-markdown';

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

export const StoryMarkdown = ({ body }: { body: string }) => (
  <ReactMarkdown components={components} disallowedElements={DISALLOWED}>
    {body}
  </ReactMarkdown>
);
