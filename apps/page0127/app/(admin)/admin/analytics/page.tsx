// GA 유입·행동 분석 골격. 데이터 연결은 다음 라운드(베타 트래픽 후).
// 여기서는 정보구조(탭)만 고정한다.
const TABS = [
  { key: 'acquisition', label: '유입', desc: '소스/매체/캠페인' },
  { key: 'geo', label: '국가·지역', desc: '국가별, 시/군/구별' },
  { key: 'search', label: '검색어', desc: 'Search Console 검색어·노출·클릭' },
  { key: 'pages', label: '인기·이탈 페이지', desc: '인기 페이지, 이탈 페이지' },
  { key: 'quality', label: '방문 품질', desc: '기기·브라우저·해상도·OS·성별·연령·요일' },
];

export default function AdminAnalyticsPage() {
  return (
    <section className='space-y-4'>
      <h1 className='text-base font-semibold'>유입분석</h1>
      <p className='text-sm text-text-faint'>
        GA·Search Console 연결은 베타 트래픽이 쌓인 뒤 추가됩니다. 아래는 준비된 분석
        영역입니다.
      </p>
      <div className='grid gap-3 sm:grid-cols-2'>
        {TABS.map((t) => (
          <div key={t.key} className='rounded-lg border border-line p-4'>
            <div className='text-sm font-medium'>{t.label}</div>
            <div className='mt-1 text-xs text-text-faint'>{t.desc}</div>
            <div className='mt-3 text-xs text-text-faint'>데이터 연결 예정</div>
          </div>
        ))}
      </div>
    </section>
  );
}
