import { cn } from "../lib/cn";

import type { ComponentProps, ReactNode } from "react";

type StatePanelProps = Omit<ComponentProps<"div">, "children"> & {
  message: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
};

/** 목록의 빈 상태와 영역 단위 오류 안내. 실패는 호출부에서 role="alert"를 지정한다. */
export const StatePanel = ({
  message,
  icon,
  children,
  className,
  ...props
}: StatePanelProps) => (
  <div
    className={cn(
      "flex flex-col items-center gap-3 rounded-2xl border border-line-soft bg-card px-5 py-10 text-center text-card-foreground",
      className,
    )}
    {...props}
  >
    {icon && (
      <span className="text-text-subtle" aria-hidden="true">
        {icon}
      </span>
    )}
    <p className="text-sm text-text-body">{message}</p>
    {children}
  </div>
);
