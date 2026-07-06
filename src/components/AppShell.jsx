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
            &copy; 2026 TC Roofing &amp; Restorations. All rights reserved.
          </footer>
        </div>
      </div>
      <ActionBar />
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
