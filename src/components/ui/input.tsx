
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // Ensure that if `props` (which comes from react-hook-form's `field`)
    // has its own `ref`, we prioritize the `ref` from `forwardRef`.
    // However, `react-hook-form`'s `field.ref` IS the one we want on the DOM element.
    // The `ref` from `forwardRef` will be `field.ref` when `Controller` renders this component.
    // So, simply passing `ref` (which is `field.ref`) and spreading `...props`
    // (which might also contain `field.ref` again under the key `ref`) should be fine,
    // but let's explicitly remove `ref` from `props` if it exists to avoid any ambiguity
    // for the underlying <input> element receiving two `ref` props.
    
    const { ref: propRef, ...restProps } = props as any; // Cast to any to access ref, then destructure

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref} // This ref is from React.forwardRef, which react-hook-form's Controller passes as field.ref
        {...restProps} // Spread the rest of the props from react-hook-form's field (value, onChange, onBlur, name)
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
