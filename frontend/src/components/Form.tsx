import type { ReactNode } from 'react'

type Option = string | { value: string; label: string }

interface FieldProps {
  label: ReactNode
  error?: string
  children: ReactNode
}

export function Field({ label, error, children }: FieldProps) {
  return (
    <div>
      <label>{label}</label>
      {children}
      {error && <div className="field-error">{error}</div>}
    </div>
  )
}

export function TextInput({ label, value, onChange, error, type = 'text', required, placeholder, ...rest }: {
  label: ReactNode
  value: string | number | null | undefined
  onChange: (v: string) => void
  error?: string
  type?: string
  required?: boolean
  placeholder?: string
  min?: number
  max?: number
  step?: string
  autoComplete?: string
  autoFocus?: boolean
}) {
  return (
    <Field label={<>{label}{required && ' *'}</>} error={error}>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={error ? 'invalid' : undefined}
        required={required}
        placeholder={placeholder}
        {...rest}
      />
    </Field>
  )
}

export function SelectInput({ label, value, onChange, options, error, placeholder, required }: {
  label: ReactNode
  value: string | null | undefined
  onChange: (v: string) => void
  options: Option[]
  error?: string
  /** Adds an empty first option with this label. */
  placeholder?: string
  required?: boolean
}) {
  return (
    <Field label={<>{label}{required && ' *'}</>} error={error}>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={error ? 'invalid' : undefined}
        required={required}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value
          const l = typeof o === 'string' ? o : o.label
          return (
            <option key={v} value={v}>
              {l}
            </option>
          )
        })}
      </select>
    </Field>
  )
}

export function TextArea({ label, value, onChange, error, placeholder, rows }: {
  label: ReactNode
  value: string | null | undefined
  onChange: (v: string) => void
  error?: string
  placeholder?: string
  rows?: number
}) {
  return (
    <Field label={label} error={error}>
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={error ? 'invalid' : undefined}
        placeholder={placeholder}
        rows={rows}
      />
    </Field>
  )
}

/** Inline filter select used in table filter bars. */
export function FilterSelect({ value, onChange, options, placeholder }: {
  value: string
  onChange: (v: string) => void
  options: Option[]
  placeholder: string
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={placeholder}>
      <option value="">{placeholder}</option>
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        return (
          <option key={v} value={v}>
            {l}
          </option>
        )
      })}
    </select>
  )
}
