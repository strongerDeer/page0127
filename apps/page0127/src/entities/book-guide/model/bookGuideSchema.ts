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

/**
 * 자리 지정 — 관계도 캔버스(가로 880) 위 좌표. 단위는 px.
 * 880 = 인스타 카드(1080) 좌우 여백 100 을 뺀 폭. 피그마 좌표에서 (100, 맨 위) 만 빼면 그대로 옮겨진다.
 * 편집기(어드민)에서 끌어 옮기면 이 값이 바뀐다. 없으면 자동으로 자리를 잡는다.
 */
export const GUIDE_CANVAS_WIDTH = 880;
const coord = z.number().int().min(0).max(2000);
const rectSchema = z.object({
  x: coord.max(GUIDE_CANVAS_WIDTH),
  y: coord,
  w: z.number().int().min(40).max(GUIDE_CANVAS_WIDTH),
  h: z.number().int().min(32).max(800).optional(),
});

/**
 * 상자 색 — 임의 색(hex)이 아니라 디자인 시스템 짝 중에서 고른다.
 * 그래야 다크 모드·글자 대비가 자동으로 맞는다. (피그마 컴포넌트와 1:1)
 * primary=파랑 채움, green=초록 채움, outline=초록 테두리,
 * white=흰 카드(판 안), line=흰 카드+테두리(판 밖), sunken=회색 카드
 */
export const GUIDE_TONES = [
  'primary',
  'green',
  'outline',
  'white',
  'line',
  'sunken',
] as const;

/**
 * 테두리·배경에 쓰는 색 — 디자인 시스템 semantic 토큰 이름 그대로(CSS 변수 `var(--이름)`).
 * hex 를 받지 않는 이유: 다크 모드에서 토큰은 알아서 바뀌고, 시스템 색을 바꾸면 모든 가이드가 따라온다.
 * (HJ 11/21 "토큰 팔레트에서 고르기")
 */
export const GUIDE_COLORS = [
  'primary',
  'guide-green',
  'text-strong',
  'text-body',
  'text-subtle',
  'chart-7',
  'rank-up',
  'line',
  'line-soft',
  'card',
  'sunken',
  'accent',
] as const;

export const GUIDE_BORDER_STYLES = ['solid', 'dashed', 'dotted'] as const;

/** 상자·판 테두리. 있으면 tone 의 기본 테두리 대신 이 값을 쓴다 */
const borderSchema = z.object({
  color: z.enum(GUIDE_COLORS),
  width: z.number().int().min(1).max(6),
  style: z.enum(GUIDE_BORDER_STYLES).optional(),
});

/**
 * 글꼴 — 기본(Pretendard)과 명조 둘만. 한글 웹폰트는 몇 MB라 종류를 늘리면 페이지가 느려진다.
 * 명조는 시스템 글꼴(AppleMyungjo·Noto Serif KR·바탕)이라 내려받는 파일이 없다.
 */
export const GUIDE_FONTS = ['sans', 'serif'] as const;

const personSchema = z.object({
  /** 관계선이 가리키는 키 — 같은 가이드 안에서만 유일하면 된다 */
  id: text(40),
  name: text(40),
  /** 이름 옆에 작게 붙는 별명 — "강영두(깨죽이)" 의 깨죽이 */
  alias: text(20).optional(),
  /** 없으면 이름만 보인다 — 원작에 설명이 없는 인물을 지어내지 않는다 */
  /** 줄바꿈(\n)은 그대로 보여 준다 */
  role: text(60).optional(),
  tone: z.enum(GUIDE_TONES).optional(),
  border: borderSchema.optional(),
  /** 없으면 캔버스 글꼴(canvas.font)을 따른다 */
  font: z.enum(GUIDE_FONTS).optional(),
  at: rectSchema.optional(),
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
          /** 관계선이 묶음 전체(회색 판)를 가리킬 때 쓰는 키 */
          id: text(40).optional(),
          name: text(40),
          /** 회색 판 자리. 캔버스 모드에서 자리 없는 구성원은 판 안에 격자로 채운다 */
          box: rectSchema.optional(),
          /** 판 안 격자 열 수 */
          cols: z.number().int().min(1).max(4).optional(),
          /** 판 면 색 — 없으면 sunken(회색) */
          fill: z.enum(GUIDE_COLORS).optional(),
          border: borderSchema.optional(),
          members: z.array(personSchema).min(1).max(12),
        })
      )
      .max(6),
    links: z
      .array(
        z.object({
          from: text(40),
          to: text(40),
          /** 없으면 선만 긋는다 */
          label: text(20).optional(),
          kind: z.enum(GUIDE_LINK_KINDS),
          /**
           * 피그마에서 가져온 선 모양 그대로(꺾은선 여러 개 + 배지 자리).
           * 없으면 양 끝 상자를 보고 자동으로 긋는다. 편집기에서 상자를 옮기면 지워진다(자동으로 돌아감).
           * lines 가 빈 배열이면 그리지 않는다 — 갈래선(산아→스미·오태양)처럼 다른 관계가 대신 그린 경우.
           */
          route: z
            .object({
              lines: z
                .array(
                  z
                    .array(z.tuple([coord, coord]))
                    .min(2)
                    .max(40)
                )
                .max(8),
              badge: z.tuple([coord, coord]).optional(),
            })
            .optional(),
        })
      )
      .max(30),
    /**
     * 있으면 "캔버스 모드" — 상자를 적힌 좌표에 그대로 그린다(인스타 카드와 같은 그림).
     * 없으면 지금처럼 자동 배치(가지 모양).
     */
    /** 범례 이름 바꾸기 — 예: 기록 속 사람들의 실선은 "인연" 대신 "기록" */
    legend: z.partialRecord(z.enum(GUIDE_LINK_KINDS), text(10)).optional(),
    canvas: z
      .object({
        /** 없으면 가장 아래 상자에 맞춘다 */
        height: z.number().int().min(120).max(2000).optional(),
        /** 캔버스 전체 기본 글꼴 */
        font: z.enum(GUIDE_FONTS).optional(),
        /**
         * 밑에 까는 배경 — 색 또는 그림 한 장(둘 다 가능, 그림이 위).
         * 그림 주소는 어드민에서 올린 파일만(저장 액션이 버킷 주소인지 검사).
         * 그림이 있으면 다크 모드에서도 캔버스만 밝은 색으로 고정한다(밝은 그림 위 흰 글자 방지).
         */
        background: z
          .object({
            color: z.enum(GUIDE_COLORS).optional(),
            image: z
              .url({ protocol: /^https?$/ })
              .max(500)
              .optional(),
            /** cover=캔버스를 꽉 채움(잘릴 수 있음), contain=그림 전체 보이기 */
            fit: z.enum(['cover', 'contain']).optional(),
            /** 그림 진하기 0.1~1 — 글자 위에서 흐리게 깔 때 */
            opacity: z.number().min(0.1).max(1).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .superRefine((section, ctx) => {
    // 관계선이 없는 사람을 가리키면 그림에서 선이 허공으로 간다 → 저장 전에 막는다
    const ids = [
      ...section.leads,
      ...section.groups.flatMap((g) => g.members),
    ].map((p) => p.id);
    // 선 끝은 사람 id 또는 묶음 id
    const known = new Set([
      ...ids,
      ...section.groups.flatMap((g) => (g.id ? [g.id] : [])),
    ]);

    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['groups'],
        message:
          '인물 id가 겹쳐요. 같은 가이드 안에서 id는 하나씩만 써 주세요.',
      });
    }

    // 캔버스 모드: 회색 판(box)도 자기 좌표(at)도 없는 구성원은 그릴 자리가 없다
    if (section.canvas) {
      section.groups.forEach((group, gi) => {
        if (group.box) return;
        group.members.forEach((m, mi) => {
          if (!m.at) {
            ctx.addIssue({
              code: 'custom',
              path: ['groups', gi, 'members', mi, 'at'],
              message: `"${m.name}" 자리가 없어요. 묶음에 box를 주거나 이 사람에 at을 적어 주세요.`,
            });
          }
        });
      });
    }

    section.links.forEach((link, i) => {
      for (const end of ['from', 'to'] as const) {
        if (!known.has(link[end])) {
          ctx.addIssue({
            code: 'custom',
            path: ['links', i, end],
            message: `"${link[end]}" 인물이 없어요. leads·groups에 있는 사람 id나 묶음 id를 써 주세요.`,
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
export type GuideTone = (typeof GUIDE_TONES)[number];
export type GuideRect = z.infer<typeof rectSchema>;
export type GuideGroup = PeopleSection['groups'][number];
export type GuideLink = PeopleSection['links'][number];

/** DB 에서 읽은 값을 검사한다 — 깨졌으면 null(가이드를 숨긴다) */
export const parseBookGuideSections = (
  value: unknown
): BookGuideSection[] | null => {
  const result = bookGuideSectionsSchema.safeParse(value);
  return result.success ? result.data : null;
};
export type GuideColor = (typeof GUIDE_COLORS)[number];
export type GuideBorder = z.infer<typeof borderSchema>;
export type GuideFont = (typeof GUIDE_FONTS)[number];
export type GuideCanvas = NonNullable<PeopleSection['canvas']>;
export type GuideBackground = NonNullable<GuideCanvas['background']>;
