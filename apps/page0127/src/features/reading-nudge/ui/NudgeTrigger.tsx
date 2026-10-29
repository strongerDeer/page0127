'use client';

import { useEffect, useRef, useState } from 'react';

import { Button, Popover, PopoverAnchor, PopoverContent } from '@repo/ui';
import { Pointer } from 'lucide-react';

export const NudgeTrigger = ({
  recipientName,
  iconOnly = false,
  sent = false,
  checking = false,
  unavailable,
  onClick,
}: {
  recipientName: string;
  iconOnly?: boolean;
  sent?: boolean;
  checking?: boolean;
  unavailable?: string;
  onClick: () => void;
}) => {
  const [hintOpen, setHintOpen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const showHint = () => {
    clearTimeout(hideTimer.current);
    setHintOpen(true);
  };
  const hideHint = () => {
    hideTimer.current = setTimeout(() => setHintOpen(false), 150);
  };
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  const label = unavailable ?? (sent ? '오늘 콕 찌름' : '콕 찌르기');
  return (
    <Popover open={iconOnly && hintOpen} onOpenChange={setHintOpen}>
      <PopoverAnchor asChild>
        <Button
          type='button'
          variant='outline'
          size={iconOnly ? 'icon-sm' : 'md'}
          aria-label={`${recipientName}님 ${label}`}
          aria-disabled={sent || checking || Boolean(unavailable)}
          className='min-w-0 shrink-0 rounded-full aria-disabled:cursor-default aria-disabled:opacity-50'
          onPointerEnter={showHint}
          onPointerLeave={hideHint}
          onFocus={showHint}
          onBlur={() => setHintOpen(false)}
          onClick={() => {
            setHintOpen(false);
            onClick();
          }}
        >
          <Pointer size={16} aria-hidden='true' />
          {!iconOnly && label}
        </Button>
      </PopoverAnchor>
      <PopoverContent
        role='tooltip'
        side='top'
        align='end'
        sideOffset={6}
        className='w-auto px-3 py-1.5 text-xs'
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onPointerEnter={showHint}
        onPointerLeave={hideHint}
      >
        {label}
      </PopoverContent>
    </Popover>
  );
};
