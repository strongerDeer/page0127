import Banners from '@components/home/Banners';
import Visual from '@components/home/Visual';

export default function Home() {
  return (
    <>
      <Visual />
      <div className="max-width">
        <Banners />
        <main>main</main>
      </div>
    </>
  );
}
