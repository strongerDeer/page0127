import type { BookGuideSection } from '../model/types';

/**
 * 『대온실 수리 보고서』 읽기 가이드 — 인스타 카드(HJ 피그마)를 옮긴 내용. 스포일러 없이 초반 설정만.
 * 관계도 좌표는 피그마 카드 좌표에서 (100, 관계도 맨 위)를 뺀 값.
 */
export const daeonsilSections: BookGuideSection[] = [
  {
    type: 'people',
    title: '영두 곁의 사람들',
    era: '2023 · 대온실 현장과 석모도',
    leads: [
      {
        id: '강영두',
        name: '강영두',
        role: '대온실 수리 보고서 담당자',
        tone: 'primary',
        at: {
          x: 68,
          y: 1,
          w: 300,
          h: 136,
        },
      },
      {
        id: '은혜',
        name: '은혜',
        alias: '추진체',
        role: '강화의 공인중개사',
        tone: 'green',
        at: {
          x: 512,
          y: 1,
          w: 300,
          h: 136,
        },
      },
    ],
    groups: [
      {
        id: 'group:바위건축사사무소',
        name: '바위건축사사무소',
        box: {
          x: 28,
          y: 224,
          w: 194,
          h: 513,
        },
        members: [
          {
            id: '연희',
            name: '연희',
            role: '소장',
            tone: 'white',
            at: {
              x: 42,
              y: 277,
              w: 166,
              h: 100,
            },
          },
          {
            id: '소목(수)',
            name: '소목(수)',
            role: '사무소 동업자',
            tone: 'white',
            at: {
              x: 42,
              y: 389,
              w: 166,
              h: 100,
            },
          },
          {
            id: '은세창',
            name: '은세창',
            alias: '작도',
            role: '실측·도면 담당',
            tone: 'white',
            at: {
              x: 42,
              y: 501,
              w: 166,
              h: 100,
            },
          },
          {
            id: '제갈도희',
            name: '제갈도희',
            role: '디자이너 · 제도',
            tone: 'white',
            at: {
              x: 42,
              y: 613,
              w: 166,
              h: 100,
            },
          },
        ],
      },
      {
        id: 'group:동궐 관리청 담당',
        name: '동궐 관리청 담당',
        box: {
          x: 238,
          y: 224,
          w: 200,
          h: 513,
        },
        members: [
          {
            id: '장과장',
            name: '장과장',
            role: '관리청 담당',
            tone: 'white',
            at: {
              x: 252,
              y: 277,
              w: 172,
              h: 100,
            },
          },
          {
            id: '왕주웅',
            name: '왕주웅',
            role: '주무관',
            tone: 'white',
            at: {
              x: 252,
              y: 389,
              w: 172,
              h: 100,
            },
          },
          {
            id: '오아랑',
            name: '오아랑',
            role: '학예연구사',
            tone: 'white',
            at: {
              x: 252,
              y: 501,
              w: 172,
              h: 100,
            },
          },
        ],
      },
      {
        id: 'group:석모도',
        name: '석모도',
        box: {
          x: 452,
          y: 225,
          w: 400,
          h: 412,
        },
        members: [
          {
            id: '산아',
            name: '산아',
            role: '초등학생\n(어린이 회장)',
            tone: 'white',
            at: {
              x: 576,
              y: 301,
              w: 172,
              h: 100,
            },
          },
          {
            id: '오태양',
            name: '오태양',
            role: '새로 온 전학생',
            tone: 'white',
            at: {
              x: 658,
              y: 501,
              w: 172,
              h: 100,
            },
          },
          {
            id: '스미',
            name: '스미',
            role: '새로 온 전학생',
            tone: 'white',
            at: {
              x: 472,
              y: 501,
              w: 172,
              h: 100,
            },
          },
        ],
      },
    ],
    links: [
      {
        from: '강영두',
        to: '은혜',
        kind: 'bond',
        label: '소꿉친구',
        route: {
          lines: [
            [
              [368, 69],
              [512, 69],
            ],
          ],
          badge: [440, 68],
        },
      },
      {
        from: '강영두',
        to: 'group:바위건축사사무소',
        kind: 'work',
        label: '동료',
        route: {
          lines: [
            [
              [218, 137],
              [218, 225],
            ],
          ],
          badge: [218, 181],
        },
      },
      {
        from: '은혜',
        to: '산아',
        kind: 'family',
        label: '딸',
        route: {
          lines: [
            [
              [662, 137],
              [662, 301],
            ],
          ],
          badge: [663, 181],
        },
      },
      {
        from: '산아',
        to: '스미',
        kind: 'bond',
        label: '같은 반',
        route: {
          lines: [
            [
              [658, 397],
              [658, 479],
            ],
            [
              [569, 518],
              [569, 479],
              [746, 479],
              [746, 518],
            ],
          ],
          badge: [658, 440],
        },
      },
      {
        from: '산아',
        to: '오태양',
        kind: 'bond',
        label: '같은 반',
        route: {
          lines: [],
        },
      },
    ],
    canvas: {},
  },
  {
    type: 'people',
    title: '낙원하숙 사람들',
    era: '2003 · 원서동',
    leads: [
      {
        id: '안문자',
        name: '안문자',
        role: '낙원하숙 주인 할머니',
        tone: 'green',
        at: {
          x: 68,
          y: 219,
          w: 300,
          h: 136,
        },
      },
      {
        id: '강영두',
        name: '강영두',
        alias: '깨죽이',
        role: '석모도에서 온 중학생 2학년',
        tone: 'primary',
        at: {
          x: 512,
          y: 222,
          w: 300,
          h: 136,
        },
      },
    ],
    groups: [
      {
        id: 'group:낙원하숙',
        name: '낙원하숙',
        box: {
          x: 28,
          y: 134,
          w: 824,
          h: 504,
        },
        members: [
          {
            id: '리사',
            name: '리사',
            role: '영두와 옆 반',
            tone: 'white',
            at: {
              x: 136,
              y: 411,
              w: 168,
              h: 100,
            },
          },
          {
            id: '딩 아주머니',
            name: '딩 아주머니',
            role: '하숙집 살림 담당',
            tone: 'white',
            at: {
              x: 136,
              y: 523,
              w: 168,
              h: 100,
            },
          },
          {
            id: '유화 언니',
            name: '유화 언니',
            role: '연극하는 하숙생',
            tone: 'white',
            at: {
              x: 314,
              y: 523,
              w: 168,
              h: 100,
            },
          },
          {
            id: '삼우씨',
            name: '삼우씨',
            role: '법대생 하숙생',
            tone: 'white',
            at: {
              x: 490,
              y: 523,
              w: 168,
              h: 100,
            },
          },
        ],
      },
      {
        id: 'group:학교',
        name: '학교',
        box: {
          x: 28,
          y: 648,
          w: 491,
          h: 186,
        },
        members: [
          {
            id: '빽 (유민)',
            name: '빽 (유민)',
            role: '병원집 전교 1등',
            tone: 'white',
            at: {
              x: 134,
              y: 670,
              w: 168,
              h: 100,
            },
          },
          {
            id: '안나',
            name: '안나',
            role: '같은반 친구',
            tone: 'white',
            at: {
              x: 320,
              y: 672,
              w: 168,
              h: 100,
            },
          },
        ],
      },
      {
        name: '함께 나오는 사람들',
        members: [
          {
            id: '외할머니',
            name: '외할머니',
            tone: 'line',
            at: {
              x: 513,
              y: 0,
              w: 148,
              h: 54,
            },
          },
          {
            id: '아빠',
            name: '아빠',
            tone: 'line',
            at: {
              x: 675,
              y: 0,
              w: 176,
              h: 54,
            },
          },
          {
            id: '엄마 친구(염전)',
            name: '엄마 친구(염전)',
            tone: 'line',
            at: {
              x: 513,
              y: 64,
              w: 338,
              h: 54,
            },
          },
          {
            id: '이순신',
            name: '이순신',
            role: '뒷집 공고생',
            tone: 'line',
            at: {
              x: 541,
              y: 663,
              w: 148,
              h: 98,
            },
          },
          {
            id: '태동설비',
            name: '태동설비',
            role: '집수리 아저씨',
            tone: 'line',
            at: {
              x: 703,
              y: 663,
              w: 148,
              h: 98,
            },
          },
        ],
      },
    ],
    links: [
      {
        from: '안문자',
        to: '외할머니',
        kind: 'bond',
        label: '친구',
        route: {
          lines: [
            [
              [218, 230],
              [218, 38],
              [596, 38],
            ],
          ],
          badge: [431, 38],
        },
      },
      {
        from: '강영두',
        to: '이순신',
        kind: 'bond',
        label: '첫사랑',
        route: {
          lines: [
            [
              [662, 357],
              [662, 723],
            ],
          ],
          badge: [662, 484],
        },
      },
      {
        from: '안문자',
        to: '강영두',
        kind: 'bond',
        label: '하숙생',
        route: {
          lines: [
            [
              [367, 292],
              [511, 292],
            ],
          ],
          badge: [439, 290],
        },
      },
      {
        from: '안문자',
        to: '리사',
        kind: 'family',
        label: '손녀',
        route: {
          lines: [
            [
              [218, 294],
              [218, 411],
            ],
          ],
          badge: [214, 383],
        },
      },
    ],
    canvas: {},
  },
  {
    type: 'people',
    title: '기록 속 사람들',
    era: '1909년부터 · 동물원과 식물원 시절',
    leads: [
      {
        id: '영두',
        name: '영두',
        role: '보고서를 쓰는 사람',
        tone: 'primary',
        at: {
          x: 49,
          y: 119,
          w: 300,
          h: 136,
        },
      },
      {
        id: '후쿠다 노보루',
        name: '후쿠다 노보루',
        role: '대온실 공사 책임자',
        tone: 'green',
        at: {
          x: 49,
          y: 341,
          w: 300,
          h: 136,
        },
      },
    ],
    groups: [
      {
        id: 'group:창경원',
        name: '창경원',
        box: {
          x: 453,
          y: 287,
          w: 350,
          h: 406,
        },
        members: [
          {
            id: '시모코리야마 세이이치',
            name: '시모코리야마 세이이치',
            role: '창경원 책임자·조류학자',
            tone: 'white',
            at: {
              x: 466,
              y: 347,
              w: 320,
              h: 100,
            },
          },
          {
            id: '가마야마 마사시',
            name: '가마야마 마사시',
            role: '대온실 관리자',
            tone: 'white',
            at: {
              x: 466,
              y: 459,
              w: 320,
              h: 100,
            },
          },
          {
            id: '기노시타 코주(박목주)',
            name: '기노시타 코주(박목주)',
            role: '후쿠다 다음 식물원 책임자',
            tone: 'white',
            at: {
              x: 466,
              y: 571,
              w: 320,
              h: 100,
            },
          },
        ],
      },
      {
        name: '함께 나오는 사람들',
        members: [
          {
            id: '코미야 미호마츠',
            name: '코미야 미호마츠',
            role: '궁내부 차관·창경궁 공사 책임자',
            tone: 'sunken',
            at: {
              x: 468,
              y: 0,
              w: 320,
              h: 100,
            },
          },
          {
            id: '스에마츠 쿠마히코',
            name: '스에마츠 쿠마히코',
            role: '창경원 총책임자(20년)',
            tone: 'sunken',
            at: {
              x: 468,
              y: 119,
              w: 320,
              h: 100,
            },
          },
        ],
      },
    ],
    links: [
      {
        from: '영두',
        to: '후쿠다 노보루',
        kind: 'bond',
        label: '회고록',
        route: {
          lines: [
            [
              [199, 255],
              [199, 341],
            ],
          ],
          badge: [199, 298],
        },
      },
      {
        from: '후쿠다 노보루',
        to: 'group:창경원',
        kind: 'work',
        label: '동료',
        route: {
          lines: [
            [
              [349, 409],
              [452, 409],
            ],
          ],
          badge: [403, 409],
        },
      },
      {
        from: '코미야 미호마츠',
        to: '시모코리야마 세이이치',
        kind: 'work',
        label: '이전 관리자',
        route: {
          lines: [
            [
              [626, 110],
              [626, 347],
            ],
          ],
          badge: [626, 253],
        },
      },
    ],
    legend: {
      bond: '기록',
    },
    canvas: {},
  },
  {
    type: 'people',
    title: '배고픈 쿠마 센세이',
    era: '작품 속 동화',
    leads: [
      {
        id: '마리코 히메',
        name: '마리코 히메',
        role: '히메 = 공주',
        tone: 'green',
        at: {
          x: 116,
          y: 460,
          w: 300,
          h: 136,
        },
      },
    ],
    groups: [
      {
        id: 'group:창경원',
        name: '창경원',
        box: {
          x: 522,
          y: 0,
          w: 350,
          h: 406,
        },
        members: [
          {
            id: '조류 박사',
            name: '조류 박사',
            role: '원장',
            tone: 'white',
            at: {
              x: 535,
              y: 60,
              w: 320,
              h: 100,
            },
          },
          {
            id: '오니 아이',
            name: '오니 아이',
            role: '식물원·동물원 대장',
            tone: 'white',
            at: {
              x: 535,
              y: 172,
              w: 320,
              h: 100,
            },
          },
          {
            id: '고무장화',
            name: '고무장화',
            role: '사육사',
            tone: 'white',
            at: {
              x: 535,
              y: 284,
              w: 320,
              h: 100,
            },
          },
        ],
      },
      {
        id: 'group:창경원 동물',
        name: '창경원 동물',
        box: {
          x: 522,
          y: 460,
          w: 350,
          h: 294,
        },
        members: [
          {
            id: '쿠마 센세이',
            name: '쿠마 센세이',
            role: '곰 선생님',
            tone: 'white',
            at: {
              x: 535,
              y: 520,
              w: 320,
              h: 100,
            },
          },
          {
            id: '빨간 등',
            name: '빨간 등',
            role: '원숭이',
            tone: 'white',
            at: {
              x: 535,
              y: 632,
              w: 320,
              h: 100,
            },
          },
        ],
      },
      {
        name: '함께 나오는 사람들',
        members: [
          {
            id: '할머니',
            name: '할머니',
            tone: 'line',
            at: {
              x: 0,
              y: 108,
              w: 178,
              h: 54,
            },
          },
          {
            id: '양부',
            name: '양부',
            role: '창경원 관리',
            tone: 'line',
            at: {
              x: 226,
              y: 177,
              w: 178,
              h: 98,
            },
          },
          {
            id: '엄마',
            name: '엄마',
            tone: 'line',
            at: {
              x: 0,
              y: 180,
              w: 178,
              h: 54,
            },
          },
          {
            id: '유마',
            name: '유마',
            tone: 'line',
            at: {
              x: 226,
              y: 308,
              w: 178,
              h: 54,
            },
          },
          {
            id: '시미즈 마리코',
            name: '시미즈 마리코',
            role: '이 동화를 쓴 사람',
            tone: 'outline',
            at: {
              x: 117,
              y: 626,
              w: 296,
              h: 96,
            },
          },
        ],
      },
    ],
    links: [
      {
        from: '유마',
        to: '마리코 히메',
        kind: 'family',
        label: '동생',
        route: {
          lines: [
            [
              [299, 363],
              [299, 460],
            ],
          ],
          badge: [300, 409],
        },
      },
      {
        from: '엄마',
        to: '양부',
        kind: 'family',
        route: {
          lines: [
            [
              [151, 207],
              [242, 207],
            ],
            [
              [202, 207],
              [202, 335],
              [319, 335],
            ],
          ],
        },
      },
      {
        from: '엄마',
        to: '유마',
        kind: 'family',
        route: {
          lines: [],
        },
      },
      {
        from: '할머니',
        to: '마리코 히메',
        kind: 'family',
        route: {
          lines: [
            [
              [84, 148],
              [84, 528],
              [192, 528],
            ],
          ],
        },
      },
      {
        from: '양부',
        to: '오니 아이',
        kind: 'work',
        label: '상관',
        route: {
          lines: [
            [
              [405, 222],
              [535, 222],
            ],
          ],
          badge: [462, 222],
        },
      },
    ],
    canvas: {},
  },
  {
    type: 'timeline',
    title: '궁궐이 놀이공원이 되기까지',
    subtitle: '창경궁 → 창경원',
    items: [
      {
        when: '1483',
        title: '창경궁이 세워져요',
        note: '성종이 왕실 어른들을 위해 지었어요',
      },
      {
        when: '1907',
        title: '순종이 창덕궁으로 옮겨 가요',
        note: '창경궁과 담을 맞댄 궁궐이에요',
      },
      {
        when: '1909',
        title: '대온실이 문을 열어요',
        note: '동물원·식물원과 함께 공개됐어요',
      },
      {
        when: '1911',
        title: "이름이 '창경원'으로 바뀌어요",
        note: '궁(宮)이 공원(苑)으로 낮춰졌어요',
      },
    ],
  },
  {
    type: 'timeline',
    title: '다시 궁이 되고, 대온실은 남았어요',
    subtitle: '창경원 → 창경궁',
    items: [
      {
        when: '1983',
        title: "'창경궁' 이름을 되찾아요",
        note: '동물원은 과천으로 옮겨 가요(~1984)',
      },
      {
        when: '2004',
        title: '등록문화재가 돼요',
        note: '우리나라 첫 서양식 온실이에요',
      },
      {
        when: '2017',
        title: '보수를 마치고 다시 열어요',
        note: '보수공사로 처음 모습을 되살렸어요',
      },
      {
        when: '소설',
        title: '2023년, 대온실 수리 현장',
        note: '영두가 이 공사를 기록해요',
      },
    ],
  },
  {
    type: 'places',
    title: '책 들고 창경궁 걷기',
    subtitle: '소설 속 길을 걷고, 만두로 마무리해요',
    routes: [
      {
        label: '2023 · 수리하며',
        stops: [
          {
            name: '옥천교',
            note: '해치가 지켜요',
          },
          {
            name: '명정전',
          },
          {
            name: '문정전',
          },
          {
            name: '관천대',
            note: '관리청 옆',
          },
        ],
      },
      {
        label: '2003 · 어린 날',
        stops: [
          {
            name: '월근문',
          },
          {
            name: '춘당지',
            note: '작품 속 겨울 빙판',
          },
          {
            name: '대온실',
          },
        ],
      },
      {
        label: '2003 · 원서동 산책',
        stops: [
          {
            name: '원서동 골목',
          },
          {
            name: '깡통만두',
            note: '안국역 2번 출구',
          },
          {
            name: '가회동 성당',
          },
        ],
      },
    ],
  },
];
