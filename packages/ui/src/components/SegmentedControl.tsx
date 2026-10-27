import { cn } from "../lib/cn";

import type { ComponentProps } from "react";

/** 같은 영역의 보기 전환. 필터는 group + aria-pressed, 패널은 tablist + aria-selected. */
export const segmentedItemClassName =
  "inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-primary aria-pressed:text-primary-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground [&_svg]:text-current aria-selected:bg-primary aria-selected:text-primary-foreground hover:bg-accent hover:text-accent-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground aria-selected:hover:bg-primary aria-selected:hover:text-primary-foreground";

export const SegmentedControl = ({
  className,
  ...props
}: ComponentProps<"div">) => (
  <div
    role="group"
    className={cn(
      "flex flex-wrap items-center gap-1 rounded-xl bg-sunken p-1 text-text-body",
      className,
    )}
    {...props}
  />
);

export const SegmentedControlItem = ({
  className,
  ...props
}: ComponentProps<"button">) => (
  <button
    type="button"
    className={cn(segmentedItemClassName, className)}
    {...props}
  />
);
