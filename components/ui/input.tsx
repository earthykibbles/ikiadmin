import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-14 w-full rounded-2xl border-2 border-iki-grey bg-dark-blue/50 px-5 py-4 text-sm text-iki-white placeholder:text-iki-white/30 hover:border-iki-brown/30 focus-visible:border-light-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-green/50 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
