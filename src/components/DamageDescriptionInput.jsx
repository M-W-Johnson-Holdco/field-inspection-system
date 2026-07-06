import { useEffect, useRef } from 'react'

export default function DamageDescriptionInput({ value, onChange, className = 'ri-damage-input', ...props }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || document.activeElement === el) return
    const nextValue = value || ''
    if (el.value !== nextValue) el.value = nextValue
  }, [value])

  return (
    <textarea
      ref={ref}
      className={className}
      defaultValue={value || ''}
      onChange={e => onChange(e.target.value)}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      {...props}
    />
  )
}
