import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/shared/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-primary-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20",
        // 07 §2.3 — 그림자는 실제로 떠 있는 것에만. outline 버튼은 표면에 붙어 있고
        // border 가 이미 경계를 만들므로 shadow-xs 를 뺐다.
        outline:
          "border bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  disabled,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /**
     * 제출·요청이 진행 중. 스피너를 앞에 붙이고 버튼을 잠근다.
     *
     * 버튼 안 로딩에 Spinner 컴포넌트를 쓰지 않는 이유: 버튼은 이미 자기 이름을
     * 갖고 있어서 role='status' 를 또 두면 스크린리더가 두 번 읽는다.
     * 여기서는 aria-busy 로 "이 버튼이 일하는 중"만 알린다.
     */
    loading?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  // asChild 는 자식 하나를 그대로 쓰는 모드라 스피너를 끼워 넣을 자리가 없다.
  // 조용히 무시하면 "왜 안 도나"가 되므로 개발 중에만 알린다.
  if (process.env.NODE_ENV !== "production" && asChild && loading) {
    console.warn(
      "Button: asChild 와 loading 은 함께 쓸 수 없다 — 자식 요소에 직접 표시하라."
    )
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 aria-hidden className="animate-spin" />}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
