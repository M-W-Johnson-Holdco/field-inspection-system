import { useCallback } from 'react'
import { useInspection } from '../context/InspectionContext'

export default function useExpandedSection(key, defaultOpen = false) {
  const { expandedSections, setSectionExpanded } = useInspection()
  const isOpen = Object.prototype.hasOwnProperty.call(expandedSections, key)
    ? expandedSections[key]
    : defaultOpen

  const setIsOpen = useCallback((valueOrUpdater) => {
    setSectionExpanded(key, stored => {
      const current = stored !== undefined ? stored : defaultOpen
      return typeof valueOrUpdater === 'function' ? valueOrUpdater(current) : valueOrUpdater
    })
  }, [key, defaultOpen, setSectionExpanded])

  return [isOpen, setIsOpen]
}
