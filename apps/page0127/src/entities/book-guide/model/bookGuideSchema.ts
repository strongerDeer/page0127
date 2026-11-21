import { z } from 'zod';

/**
 * 읽기 가이드 데이터 모양 — 책 정보 페이지(HTML)와 인스타 카드가 같은 데이터를 쓴다.
 *
 * 학습 포인트:
 * - DB 는 sections 를 JSONB 로 받아 "배열이다" 까지만 검사한다. 모양은 여기서 지킨다.
 * - 판별 유니온(discriminated union): `type` 값 하나로 어떤 모양인지 갈린다.
 *   렌더할 때 `switch (section.type)` 안에서 TS 가 필드를 정확히 좁혀 준다.
 * - 스키마 하나에서 타입을 뽑는다(z.infer) — 검사 규칙과 타입이 어긋날 수 없다.
 * - 읽을 때도 검사한다(safeParse). 저장 후 스키마가 바뀌어도 깨진 행 하나가
 *   페이지 전체를 500 으로 만들지 않고, 그 가이드만 숨는다.
 */

const text = (max: number) => z.string().trim().min(1).max(max);

const personSchema = z.object({
  /** 관계선이 가리키는 키 — 같은 가이드 안에서만 유일하면 된다 */
  id: text(40),
  name: text(40),
  /** 없으면 이름만 보인다 — 원작에 설명이 없는 인물을 지어내지 않는다 */
  role: text(60).optional(),
});

/** 관계 종류 — 카드에서는 선 모양(실선·점선·파선), 사이트에서는 배지 색이 된다 */
export const GUIDE_LINK_KINDS = ['bond', 'family', 'work'] as const;

const peopleSectionSchema = z
  .object({
    type: z.literal('people'),
    title: text(40),
    era: text(60).optional(),
    /** 큰 칸으로 보여 줄 중심 인물 1~2명 */
    leads: z.array(personSchema).min(1).max(2),
    groups: z
      .array(
        z.object({
          name: text(40),
          members: z.array(personSchema).min(1).max(12),
        })
      )
      .max(6),
    links: z
      .array(
        z.object({
          from: text(40),
          to: text(40),
          label: text(20),
          kind: z.enum(GUIDE_LINK_KINDS),
        })
      )
      .max(30),
  })
  .superRefine((section, ctx) => {
    // 관계선이 없는 사람을 가리키면 그림에서 선이 허공으로 간다 → 저장 전에 막는다
    const ids = [
      ...section.leads,
      ...section.groups.flatMap((g) => g.members),
    ].map((p) => p.id);
    const known = new Set(ids);

    if (known.size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['groups'],
        message:
          '인물 id가 겹쳐요. 같은 가이드 안에서 id는 하나씩만 써 주세요.',
      });
    }

    section.links.forEach((link, i) => {
      for (const end of ['from', 'to'] as const) {
        if (!known.has(link[end])) {
          ctx.addIssue({
            code: 'custom',
            path: ['links', i, end],
            message: `"${link[end]}" 인물이 없어요. leads나 groups에 있는 id를 써 주세요.`,
          });
        }
      }
    });
  });

const timelineSectionSchema = z.object({
  type: z.literal('timeline'),
  title: text(40),
  subtitle: text(60).optional(),
  items: z
    .array(
      z.object({
        /** "1909"·"소설" 처럼 연도가 아닐 수도 있어 문자열 */
        when: text(12),
        title: text(40),
        note: text(80).optional(),
      })
    )
    .min(1)
    .max(8),
});

const placesSectionSchema = z.object({
  type: z.literal('places'),
  title: text(40),
  subtitle: text(60).optional(),
  routes: z
    .array(
      z.object({
        label: text(30),
        stops: z
          .array(z.object({ name: text(30), note: text(40).optional() }))
          .min(1)
          .max(8),
      })
    )
    .min(1)
    .max(4),
});

export const bookGuideSectionSchema = z.discriminatedUnion('type', [
  peopleSectionSchema,
  timelineSectionSchema,
  placesSectionSchema,
]);

export const bookGuideSectionsSchema = z
  .array(bookGuideSectionSchema)
  .min(1)
  .max(10);

export type BookGuideSection = z.infer<typeof bookGuideSectionSchema>;
export type PeopleSection = z.infer<typeof peopleSectionSchema>;
export type TimelineSection = z.infer<typeof timelineSectionSchema>;
export type PlacesSection = z.infer<typeof placesSectionSchema>;
export type GuidePerson = z.infer<typeof personSchema>;
export type GuideLinkKind = (typeof GUIDE_LINK_KINDS)[number];

/** DB 에서 읽은 값을 검사한다 — 깨졌으면 null(가이드를 숨긴다) */
export const parseBookGuideSections = (
  value: unknown
): BookGuideSection[] | null => {
  const result = bookGuideSectionsSchema.safeParse(value);
  return result.success ? result.data : null;
};
