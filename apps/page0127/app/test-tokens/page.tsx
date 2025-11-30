/*
  Design Tokens 테스트 페이지

  학습 포인트:
  - CSS import: Next.js에서 CSS 파일을 컴포넌트에 직접 import
  - CSS Variables: --변수명 형태로 정의된 토큰을 사용
  - data-theme 속성: 테마 전환을 위한 HTML 속성
*/
// Design Tokens CSS import
import '@repo/design-tokens/css/light.css';

export const TestTokensPage = () => {
  return (
    <div data-theme='light' className='min-h-screen p-8'>
      <div className='container mx-auto max-w-4xl'>
        <h1 className='mb-8 text-4xl font-bold'>🎨 Design Tokens 테스트</h1>

        {/* 배경색 테스트 */}
        <section className='mb-12'>
          <h2 className='mb-4 text-2xl font-semibold'>Background Colors</h2>
          <div className='grid grid-cols-3 gap-4'>
            <div
              className='rounded-lg p-6'
              style={{
                backgroundColor: 'var(--light-color-background-primary)',
              }}
            >
              <p className='font-medium'>Primary</p>
              <code className='text-sm'>background-primary</code>
            </div>
            <div
              className='rounded-lg p-6'
              style={{
                backgroundColor: 'var(--light-color-background-secondary)',
              }}
            >
              <p className='font-medium'>Secondary</p>
              <code className='text-sm'>background-secondary</code>
            </div>
            <div
              className='rounded-lg p-6'
              style={{
                backgroundColor: 'var(--light-color-background-tertiary)',
              }}
            >
              <p className='font-medium'>Tertiary</p>
              <code className='text-sm'>background-tertiary</code>
            </div>
          </div>
        </section>

        {/* 텍스트 색상 테스트 */}
        <section className='mb-12'>
          <h2 className='mb-4 text-2xl font-semibold'>Text Colors</h2>
          <div className='rounded-lg bg-white p-6'>
            <p
              className='mb-2 text-lg'
              style={{ color: 'var(--light-color-text-primary)' }}
            >
              Primary Text - 주요 텍스트
            </p>
            <p
              className='mb-2'
              style={{ color: 'var(--light-color-text-secondary)' }}
            >
              Secondary Text - 부가 설명
            </p>
            <p
              className='text-sm'
              style={{ color: 'var(--light-color-text-tertiary)' }}
            >
              Tertiary Text - 보조 정보
            </p>
          </div>
        </section>

        {/* 버튼 색상 테스트 */}
        <section className='mb-12'>
          <h2 className='mb-4 text-2xl font-semibold'>
            Action Colors (Buttons)
          </h2>
          <div className='flex gap-4'>
            {/* Primary Button */}
            <button
              className='rounded-lg px-6 py-3 font-semibold transition-colors'
              style={{
                backgroundColor: 'var(--light-color-action-primary-default)',
                color: 'var(--light-color-text-inverse)',
              }}
            >
              Primary Button
            </button>

            {/* Secondary Button */}
            <button
              className='rounded-lg px-6 py-3 font-semibold transition-colors'
              style={{
                backgroundColor: 'var(--light-color-action-secondary-default)',
                color: 'var(--light-color-text-primary)',
              }}
            >
              Secondary Button
            </button>
          </div>
        </section>

        {/* Status 색상 테스트 */}
        <section className='mb-12'>
          <h2 className='mb-4 text-2xl font-semibold'>Status Colors</h2>
          <div className='flex gap-4'>
            <div
              className='rounded-lg px-4 py-2 font-medium text-white'
              style={{ backgroundColor: 'var(--light-color-status-success)' }}
            >
              Success
            </div>
            <div
              className='rounded-lg px-4 py-2 font-medium text-white'
              style={{ backgroundColor: 'var(--light-color-status-error)' }}
            >
              Error
            </div>
            <div
              className='rounded-lg px-4 py-2 font-medium text-white'
              style={{ backgroundColor: 'var(--light-color-status-warning)' }}
            >
              Warning
            </div>
          </div>
        </section>

        {/* Core Tokens 테스트 */}
        <section>
          <h2 className='mb-4 text-2xl font-semibold'>Core Tokens</h2>
          <div className='rounded-lg bg-white p-6'>
            <div className='mb-4'>
              <h3 className='mb-2 font-semibold'>Spacing</h3>
              <div className='flex items-center gap-2'>
                <div
                  className='bg-blue-500'
                  style={{
                    width: 'var(--core-spacing-xs)',
                    height: 'var(--core-spacing-xs)',
                  }}
                />
                <span>xs (4px)</span>
              </div>
              <div className='flex items-center gap-2'>
                <div
                  className='bg-blue-500'
                  style={{
                    width: 'var(--core-spacing-md)',
                    height: 'var(--core-spacing-md)',
                  }}
                />
                <span>md (16px)</span>
              </div>
            </div>

            <div>
              <h3 className='mb-2 font-semibold'>Border Radius</h3>
              <div className='flex gap-4'>
                <div
                  className='bg-gray-200 p-4'
                  style={{ borderRadius: 'var(--core-borderRadius-sm)' }}
                >
                  sm
                </div>
                <div
                  className='bg-gray-200 p-4'
                  style={{ borderRadius: 'var(--core-borderRadius-md)' }}
                >
                  md
                </div>
                <div
                  className='bg-gray-200 p-4'
                  style={{ borderRadius: 'var(--core-borderRadius-lg)' }}
                >
                  lg
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
