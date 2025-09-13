import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-black',
        className
      )}
      {...props}
    />
  )
})
Input.displayName = 'Input'
export { Input }
