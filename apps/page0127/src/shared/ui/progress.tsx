import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/shared/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      // shadcn 원본은 value 를 구조분해로 꺼내 아래 Indicator 의 transform 에만
      // 쓰고 Root 에는 넘기지 않는다. 그러면 Radix 가 값을 모르는 상태
      // (data-state="indeterminate")로 남아 **aria-valuenow 가 붙지 않는다** —
      // 눈에는 정상으로 보이지만 스크린리더는 "몇 %인지 알 수 없는 진행률"로 읽는다.
      // 실제 DOM 속성을 떠서 확인한 뒤 고쳤다.
      value={value}
      className={cn(
        // 트랙은 "아직 채워지지 않은 부분"이라 중립면(sunken)을 쓴다.
        // shadcn 기본값은 bg-primary/20 이지만, 07 원칙상 유채색은 직무가 있을
        // 때만 쓴다 — 트랙에는 직무가 없다. 유일한 실사용처도 sunken 이었다.
        "bg-sunken relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
