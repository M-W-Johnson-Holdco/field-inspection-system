import { useEffect, useState } from 'react'
import { useInspection } from '../context/InspectionContext'

/**
 * Tracks which `[data-nav-anchor]` item is most visible in `.app-scroll-region`.
 */
export default function useActiveNavItem() {
  const { activeTab } = useInspection()
  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    const root = document.querySelector('.app-scroll-region')
    if (!root) return undefined

    const visible = new Map()
    let reconnectTimer = null

    function pickActive() {
      if (visible.size === 0) return
      let bestId = null
      let bestRatio = -1
      for (const [id, ratio] of visible) {
        if (ratio > bestRatio) {
          bestRatio = ratio
          bestId = id
        }
      }
      if (bestId) setActiveId(bestId)
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-nav-anchor')
          if (!id) continue
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            visible.set(id, entry.intersectionRatio)
          } else {
            visible.delete(id)
          }
        }
        pickActive()
      },
      {
        root,
        // Prefer items near the upper portion of the scroll region
        rootMargin: '-12% 0px -55% 0px',
        threshold: [0, 0.15, 0.35, 0.6, 1],
      },
    )

    function observeAll() {
      observer.disconnect()
      visible.clear()
      root.querySelectorAll('[data-nav-anchor]').forEach(el => observer.observe(el))
    }

    observeAll()

    const mutation = new MutationObserver(() => {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = window.setTimeout(observeAll, 120)
    })
    mutation.observe(root, { childList: true, subtree: true })

    return () => {
      window.clearTimeout(reconnectTimer)
      mutation.disconnect()
      observer.disconnect()
    }
  }, [activeTab])

  return activeId
}
