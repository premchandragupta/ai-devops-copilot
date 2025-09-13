import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-black',
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'
export { Textarea }
