import type { StoryCharacterGroup } from '@/entities/story';

/**
 * 등장인물 소개 — 관계도 그림과 같은 내용을 글자로.
 *
 * 검색엔진·AI 는 그림 속 글자를 믿을 만하게 읽지 못한다. "○○ 등장인물"로 찾는 사람에게
 * 걸리려면 이름과 관계가 HTML 글자로 있어야 한다. 그래서 그림 바로 아래에 둔다.
 */
export const CharacterList = ({
  groups,
}: {
  groups: StoryCharacterGroup[];
}) => (
  <div className='grid gap-x-8 gap-y-6 sm:grid-cols-2'>
    {groups.map((group) => (
      <div key={group.name} className='min-w-0'>
        <h3 className='text-base font-semibold text-text-strong'>
          {group.name}
        </h3>
        <dl className='mt-2 space-y-1 text-sm'>
          {group.people.map((person) => (
            <div key={person.name} className='flex gap-2 break-keep'>
              <dt className='shrink-0 font-medium text-text-strong'>
                {person.name}
              </dt>
              <dd className='text-text-subtle'>{person.role}</dd>
            </div>
          ))}
        </dl>
      </div>
    ))}
  </div>
);
