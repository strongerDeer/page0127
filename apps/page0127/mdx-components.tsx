import type { MDXComponents } from 'mdx/types';

/**
 * MDX 태그 → 서비스 스타일 (App Router 에서 @next/mdx 를 쓰려면 이 파일이 앱 루트에 있어야 한다)
 *
 * 지금 MDX 를 쓰는 곳은 책 이야기(src/content/stories) 하나다. 독후감은 일반 게시글처럼
 * 읽혀야 해서 본문 글자를 크게, 줄 간격을 넉넉하게 둔다. 한글은 단어 중간에서 끊기지 않게 break-keep.
 */
const components: MDXComponents = {
  h2: (props) => <h2 className='heading-2 mt-10 first:mt-0' {...props} />,
  h3: (props) => (
    <h3 className='mt-8 text-lg font-semibold text-text-strong' {...props} />
  ),
  p: (props) => (
    <p
      className='mt-5 break-keep text-[17px] leading-[1.9] text-text-body first:mt-0'
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote
      className='mt-6 border-l-2 border-line pl-4 text-text-subtle [&>p]:mt-2 [&>p]:text-base'
      {...props}
    />
  ),
  ul: (props) => (
    <ul
      className='mt-5 list-disc space-y-1 pl-5 text-[17px] leading-[1.8] text-text-body'
      {...props}
    />
  ),
  ol: (props) => (
    <ol
      className='mt-5 list-decimal space-y-1 pl-5 text-[17px] leading-[1.8] text-text-body'
      {...props}
    />
  ),
  a: (props) => (
    <a className='text-primary underline underline-offset-2' {...props} />
  ),
  strong: (props) => (
    <strong className='font-semibold text-text-strong' {...props} />
  ),
  hr: () => <hr className='my-10 border-line' />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
