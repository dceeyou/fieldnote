import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonStyles = cva('inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: { primary: 'bg-forest-600 text-white hover:bg-forest-700', secondary: 'border border-border bg-surface text-text hover:bg-subtle', ghost: 'text-muted hover:bg-subtle hover:text-text' },
    size: { default: 'h-10 px-4', icon: 'size-10' },
  },
  defaultVariants: { variant: 'primary', size: 'default' },
})

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>
export function Button({ className, variant, size, ...props }: Props) {
  return <button className={buttonStyles({ variant, size, className })} {...props} />
}
