import { InputBookInterface } from '@app/form/page';
import Image from 'next/image';

export default function BookItem({
  item,
  index,
}: {
  item: InputBookInterface;
  index: number;
}) {
  return (
    <article className="flex flex-col gap-8 items-center">
      <div className="w-40 h-40 aspect-[1/2] flex justify-center">
        <Image
          src={item.cover}
          alt=""
          width={200}
          height={400}
          className="max-h-full w-auto border border-slate-200 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)]"
          priority={index < 4 ? true : false}
        />
      </div>
      <div className="flex flex-col text-center">
        <h3 className="font-bold">{item.title}</h3>
        <p>{item.category}</p>
      </div>
    </article>
  );
}
