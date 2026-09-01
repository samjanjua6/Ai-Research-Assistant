import { useEffect } from 'react'
import { LandingNav } from './LandingNav'
import { LandingHero } from './LandingHero'
import { LandingBeforeAfter } from './LandingBeforeAfter'
import { LandingBentoGrid } from './LandingBentoGrid'
import { LandingCitationExplorer } from './LandingCitationExplorer'
import { LandingComparison } from './LandingComparison'
import { LandingUseCases } from './LandingUseCases'
import { LandingFAQ } from './LandingFAQ'
import { LandingFooter } from './LandingFooter'
import './landing.css'

export default function LandingPage({ onSelectPrompt, onOpenWorkspace, onOpenAuth }) {
  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = 'AI Research Assistant — Autonomous Peer-Reviewed Intelligence'
  }, [])

  return (
    <div className="landing-root">
      {/* Ambient Radial Background */}
      <div className="landing-ambient-bg" />

      {/* Topbar */}
      <LandingNav
        onOpenWorkspace={onOpenWorkspace}
        onOpenAuth={onOpenAuth}
      />

      {/* Hero Section with Interactive Sandbox */}
      <LandingHero
        onSelectPrompt={onSelectPrompt}
        onOpenWorkspace={onOpenWorkspace}
      />

      {/* Before / After Hallucination Comparison */}
      <LandingBeforeAfter />

      {/* 4 Pillars Bento Grid */}
      <LandingBentoGrid onOpenWorkspace={onOpenWorkspace} />

      {/* Interactive Academic Citation & BibTeX Explorer */}
      <LandingCitationExplorer />

      {/* Feature Comparison Matrix */}
      <LandingComparison />

      {/* Personas & Use Cases */}
      <LandingUseCases onOpenWorkspace={onOpenWorkspace} />

      {/* FAQ Accordion */}
      <LandingFAQ />

      {/* Footer & Conversion Banner */}
      <LandingFooter
        onOpenWorkspace={onOpenWorkspace}
        onOpenAuth={onOpenAuth}
      />
    </div>
  )
}
