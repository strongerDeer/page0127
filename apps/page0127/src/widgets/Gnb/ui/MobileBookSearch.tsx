'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui';
import { Search } from 'lucide-react';

import { GnbSearch } from './GnbSearch';

export const MobileBookSearch = () => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type='button'
        aria-label='도서 검색'
        className='flex size-9 items-center justify-center rounded-full text-text-subtle transition-colors hover:bg-sunken hover:text-text-strong sm:hidden'
      >
        <Search aria-hidden='true' className='size-5' />
      </button>
    </PopoverTrigger>
    <PopoverContent
      aria-label='도서 검색'
      align='end'
      collisionPadding={16}
      className='w-[calc(100vw-2rem)] max-w-sm sm:hidden'
    >
      <p className='mb-3 text-sm font-semibold text-text-strong'>도서 검색</p>
      <GnbSearch showSubmit />
    </PopoverContent>
  </Popover>
);
