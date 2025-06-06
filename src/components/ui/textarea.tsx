
import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => { // ref here is the forwardedRef from react-hook-form's Controller
    // Explicitly destructure ref from props to avoid passing it twice if it exists in props.
    // The `ref` from `React.forwardRef` is the one we want to assign to the DOM element.
    const { ref: propRef, ...restProps } = props as any;

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        ref={ref} // Use the ref from React.forwardRef
        {...restProps} // Spread the remaining props (value, onChange, onBlur, name from RHF's field)
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
