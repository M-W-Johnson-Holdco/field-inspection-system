import { useCallback, useEffect, useRef, useState } from 'react'
import { useInspection } from '../context/InspectionContext'

export default function useSectionNavJump() {
  const { activeTab, setActiveTab, setSectionExpanded } = useInspection()
  const pendingRef = useRef(null)
  const [jumpToken, setJumpToken] = useState(0)

  useEffect(() => {
    const entry = pendingRef.current
    if (!entry) return undefined
    if (entry.tab !== activeTab) return undefined

    let cancelled = false
    const delay = entry.expandKey ? 400 : 80
    const timer = window.setTimeout(() => {
      if (cancelled) return
      const el = document.getElementById(entry.anchorId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      pendingRef.current = null
    }, delay)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [activeTab, jumpToken])

  const jumpTo = useCallback((entry) => {
    if (!entry) return
    pendingRef.current = entry
    if (entry.expandKey) setSectionExpanded(entry.expandKey, true)
    if (entry.tab !== activeTab) setActiveTab(entry.tab)
    setJumpToken(n => n + 1)
  }, [activeTab, setActiveTab, setSectionExpanded])

  return jumpTo
}
