import { useCallback, useEffect, useRef } from 'react'

const MOBILE_MQ = '(max-width: 759px)'

export default function DamageDescriptionInput({ value, onChange, className = 'ri-damage-input', ...props }) {
  const ref = useRef(null)

  const syncAutosize = useCallback(() => {
    const el = ref.current
    if (!el) return

    if (!window.matchMedia(MOBILE_MQ).matches) {
      el.style.height = ''
      return
    }

    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el || document.activeElement === el) return
    const nextValue = value || ''
    if (el.value !== nextValue) el.value = nextValue
    syncAutosize()
  }, [value, syncAutosize])

  useEffect(() => {
    syncAutosize()
    const mq = window.matchMedia(MOBILE_MQ)
    mq.addEventListener('change', syncAutosize)
    window.addEventListener('resize', syncAutosize)
    return () => {
      mq.removeEventListener('change', syncAutosize)
      window.removeEventListener('resize', syncAutosize)
    }
  }, [syncAutosize])

  return (
    <textarea
      ref={ref}
      className={className}
      defaultValue={value || ''}
      onChange={e => {
        onChange(e.target.value)
        syncAutosize()
      }}
      onInput={syncAutosize}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      {...props}
    />
  )
}
