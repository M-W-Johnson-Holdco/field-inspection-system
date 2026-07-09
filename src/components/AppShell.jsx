import { useEffect } from 'react'
import { useInspection, InspectionProvider } from '../context/InspectionContext'
import Header from './Header'
import TabBar from './TabBar'
import ActionBar from './ActionBar'
import ReAuthModal from './ReAuthModal'
import JobInfo from './sections/JobInfo'
import RoofSection from './sections/RoofSection'
import ElevationsSection from './sections/ElevationsSection'
import InteriorSection from './sections/InteriorSection'
import ExteriorSection from './sections/ExteriorSection'
import NotesSection from './sections/NotesSection'
import AIParseSection from './sections/AIParseSection'

function PanelContent() {
  const { activeTab } = useInspection()
  let content
  if (activeTab === 0) content = <RoofSection />
  else if (activeTab === 1) content = <ElevationsSection />
  else if (activeTab === 2) content = <InteriorSection />
  else if (activeTab === 3) content = <ExteriorSection />
  else if (activeTab === 4) content = <NotesSection />
  else if (activeTab === 5) content = <AIParseSection />
  else content = (
    <div className="coming-soon app-card">
      <p className="section-eyebrow">Inspection Workspace</p>
      <p className="coming-soon__sub">Coming soon</p>
    </div>
  )

  return <section id="section-panel" className="section-panel">{content}</section>
}

function Shell() {
  useEffect(() => {
    const scrollEl = document.querySelector('.app-scroll-region')
    if (!scrollEl) return undefined

    const savedY = Number(sessionStorage.getItem('tcScrollY') || 0)
    if (savedY > 0) {
      requestAnimationFrame(() => {
        scrollEl.scrollTop = savedY
      })
    }

    function saveScroll() {
      sessionStorage.setItem('tcScrollY', String(scrollEl.scrollTop))
    }

    scrollEl.addEventListener('scroll', saveScroll, { passive: true })
    window.addEventListener('beforeunload', saveScroll)

    return () => {
      scrollEl.removeEventListener('scroll', saveScroll)
      window.removeEventListener('beforeunload', saveScroll)
    }
  }, [])

  useEffect(() => {
    const header = document.querySelector('.app-header')
    const shell = document.querySelector('.app-shell')
    if (!header || !shell) return undefined

    const mq = window.matchMedia('(min-width: 760px)')

    function syncChromeHeight() {
      if (!mq.matches) {
        shell.style.removeProperty('--chrome-bar-height')
        return
      }
      shell.style.setProperty('--chrome-bar-height', `${header.offsetHeight}px`)
    }

    syncChromeHeight()
    const observer = new ResizeObserver(syncChromeHeight)
    observer.observe(header)
    mq.addEventListener('change', syncChromeHeight)
    window.addEventListener('resize', syncChromeHeight)

    return () => {
      observer.disconnect()
      mq.removeEventListener('change', syncChromeHeight)
      window.removeEventListener('resize', syncChromeHeight)
    }
  }, [])

  return (
    <div className="app-page">
      <div className="app-shell">
        <Header />
        <div className="app-scroll-region">
          <main className="app-main">
            <JobInfo />
            <TabBar />
            <PanelContent />
          </main>
          <footer className="app-footer">
            &copy; 2026 Peachtree Roofing &amp; Exteriors. All rights reserved.
          </footer>
        </div>
        <div className="app-toolbar-region">
          <ActionBar />
        </div>
      </div>
      <ReAuthModal />
    </div>
  )
}

export default function AppShell() {
  return (
    <InspectionProvider>
      <Shell />
    </InspectionProvider>
  )
}
