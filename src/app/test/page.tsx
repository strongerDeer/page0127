import Button from '@components/shared/Button';

export default function testPage() {
  return (
    <main>
      <h2>링크</h2>

      <h3>Solid</h3>
      <div className="flex gap-4">
        <Button href="https://naver.com" size="sm">
          링크
        </Button>
        <Button href="https://naver.com">링크</Button>
        <Button href="https://naver.com" size="lg">
          링크
        </Button>
      </div>

      <h3>Outline</h3>
      <div className="flex gap-4">
        <Button href="#" variant="outline" size="sm">
          링크
        </Button>
        <Button href="#" variant="outline">
          링크
        </Button>
        <Button href="#" variant="outline" size="lg">
          링크
        </Button>
      </div>
      <h2>버튼</h2>

      <h3>Solid</h3>
      <div className="flex gap-4">
        <Button size="sm">버튼</Button>
        <Button>버튼</Button>
        <Button size="lg">버튼</Button>

        <Button size="sm" disabled>
          버튼
        </Button>
        <Button disabled>버튼</Button>
        <Button size="lg" disabled>
          버튼
        </Button>
      </div>

      <h3>Outline</h3>
      <div className="flex gap-4">
        <Button variant="outline" size="sm">
          버튼
        </Button>
        <Button variant="outline">버튼</Button>
        <Button variant="outline" size="lg">
          버튼
        </Button>

        <Button variant="outline" size="sm" disabled>
          버튼
        </Button>
        <Button variant="outline" disabled>
          버튼
        </Button>
        <Button variant="outline" size="lg" disabled>
          버튼
        </Button>
      </div>
    </main>
  );
}
