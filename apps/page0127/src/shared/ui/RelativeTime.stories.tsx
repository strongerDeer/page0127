import { RelativeTime } from '@/shared/ui/RelativeTime';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const ago = (seconds: number) =>
  new Date(Date.now() - seconds * 1000).toISOString();

const MIN = 60;
const HOUR = MIN * 60;
const DAY = HOUR * 24;

/**
 * "3시간 전" 같은 상대 시간.
 *
 * ## `<time>` 태그를 쓰는 이유
 *
 * 화면에는 "3일 전"만 보이지만 `dateTime` 속성에 **기계가 읽을 정확한 시각**이 들어간다.
 * 스크린리더와 검색엔진이 그것을 읽는다. `<span>3일 전</span>` 으로 쓰면 그 정보가 없다.
 *
 * `title` 에는 "2026년 7월 14일 화요일"이 들어가 마우스를 올리면 뜬다 —
 * "3일 전"만으로는 정확히 언제인지 알 길이 없기 때문이다.
 *
 * ## 언제까지 상대로 쓰나
 *
 * 기본 **7일**까지만 "N일 전"이고 그 뒤로는 `2026.06.12` 같은 절대 날짜로 바뀐다.
 * "43일 전"은 사람이 못 셈한다. `relativeLimitDays` 로 조절한다.
 *
 * 단계는 이렇다: `방금 전` → `N분 전` → `N시간 전` → `N일 전` → `YYYY.MM.DD`
 *
 * ## 미래 시각
 *
 * 서버와 클라이언트의 시계가 조금 어긋나면 미래 시각이 들어올 수 있다.
 * 그때 "-3분 전" 같은 걸 만들지 않고 "방금 전"으로 처리한다.
 *
 * ## ⚠️ 렌더 시점에 계산된다
 *
 * Server Component 에서 쓰면 **서버 시각 기준으로 HTML 에 박히고**, 사용자가 페이지를
 * 열어둔 채 시간이 흘러도 갱신되지 않는다. 피드·알림처럼 계속 열어두는 화면은 어차피
 * refetch 로 다시 그려지므로 무방하다. 초 단위로 정확해야 하는 화면이라면 이 컴포넌트가
 * 맞지 않는다.
 *
 * ## 파싱 실패
 *
 * 날짜를 못 읽으면 **아무것도 그리지 않는다**(`null`). 빈 `<time>` 을 남기면 스크린리더가
 * 의미 없는 요소를 읽게 된다.
 */
const meta = {
  title: 'UI/RelativeTime',
  component: RelativeTime,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    date: {
      control: 'text',
      description: 'ISO 8601 문자열 또는 Date.',
      table: { category: 'Content' },
    },
    relativeLimitDays: {
      control: 'number',
      description: '며칠까지 상대 시간으로 쓸지. 이후는 절대 날짜.',
      table: { category: 'Content', defaultValue: { summary: '7' } },
    },
    className: {
      control: 'text',
      description: '크기·색은 여기서. 보통 text-xs text-text-subtle.',
      table: { category: 'Appearance' },
    },
  },
  args: {
    date: ago(3 * HOUR),
    className: 'text-sm text-text-subtle',
  },
} satisfies Meta<typeof RelativeTime>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** 단계별. 7일을 넘기면 절대 날짜로 바뀐다. */
export const Steps: Story = {
  render: (args) => (
    <table className='text-sm'>
      <tbody className='divide-y divide-line-soft'>
        {[
          ['30초 전', ago(30)],
          ['3분 전', ago(3 * MIN)],
          ['5시간 전', ago(5 * HOUR)],
          ['3일 전', ago(3 * DAY)],
          ['10일 전 (한계 넘음)', ago(10 * DAY)],
          ['1년 전', ago(365 * DAY)],
        ].map(([label, iso]) => (
          <tr key={label}>
            <td className='py-2 pr-8 text-text-subtle'>{label}</td>
            <td className='py-2 font-medium text-text-strong'>
              <RelativeTime {...args} date={iso} className='' />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};

/**
 * `relativeLimitDays` 로 한계를 바꾼다. 같은 10일 전이라도 기준에 따라 다르게 나온다.
 */
export const LimitDays: Story = {
  render: (args) => (
    <table className='text-sm'>
      <tbody className='divide-y divide-line-soft'>
        {[7, 14, 30].map((limit) => (
          <tr key={limit}>
            <td className='py-2 pr-8 text-text-subtle'>
              relativeLimitDays={limit}
            </td>
            <td className='py-2 font-medium text-text-strong'>
              <RelativeTime
                {...args}
                date={ago(10 * DAY)}
                relativeLimitDays={limit}
                className=''
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};

/**
 * 미래 시각(서버-클라이언트 시계 오차)이 들어와도 "-3분 전"을 만들지 않는다.
 */
export const FutureDate: Story = {
  args: { date: new Date(Date.now() + 3 * MIN * 1000).toISOString() },
};

/**
 * 읽을 수 없는 날짜면 **아무것도 그리지 않는다.** 아래 상자가 비어 있는 것이 정상이다 —
 * 빈 `<time>` 을 남기지 않는다.
 */
export const InvalidDate: Story = {
  args: { date: 'not-a-date' },
  render: (args) => (
    <div className='rounded-md border border-dashed border-line px-4 py-3'>
      <RelativeTime {...args} />
    </div>
  ),
};

/** 실제 화면 한 조각 — 활동 목록의 메타 줄. */
export const InActivityList: Story = {
  render: () => (
    <ul className='w-80 divide-y divide-line-soft'>
      {[
        { title: '아무튼, 계속', action: '완독', at: ago(2 * HOUR) },
        { title: '읽었습니다', action: '담기', at: ago(2 * DAY) },
        { title: '동물농장', action: '완독', at: ago(20 * DAY) },
      ].map((item) => (
        <li key={item.title} className='py-3'>
          <p className='text-sm font-medium text-text-strong'>{item.title}</p>
          <p className='mt-0.5 text-xs text-text-subtle'>
            {item.action} ·{' '}
            <RelativeTime date={item.at} className='text-text-subtle' />
          </p>
        </li>
      ))}
    </ul>
  ),
};
