import { forwardRef, useId, type InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const reactId = useId()
    const inputId = id || props.name || reactId
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-text">
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-forest-500 disabled:opacity-50 ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-border'
          } ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-muted">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'
