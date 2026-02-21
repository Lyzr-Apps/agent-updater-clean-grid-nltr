'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { listSchedules, getScheduleLogs, pauseSchedule, resumeSchedule, cronToHuman } from '@/lib/scheduler'
import type { Schedule, ExecutionLog } from '@/lib/scheduler'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  HiHome, HiClock, HiCog6Tooth, HiMagnifyingGlass, HiArrowTopRightOnSquare,
  HiSparkles, HiChevronDown, HiChevronUp, HiArrowPath, HiBolt,
  HiCheckCircle, HiXCircle, HiSignal, HiPause, HiPlay, HiCalendarDays,
  HiFunnel, HiBars3, HiXMark, HiInformationCircle, HiTrash
} from 'react-icons/hi2'
import { FiCpu, FiLayers } from 'react-icons/fi'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENT_ID = '69996db3771423cce61cd169'
const SCHEDULE_ID = '69996db9399dfadeac37e3e6'
const STORAGE_KEY = 'ai_tools_digest_history'
const SETTINGS_KEY = 'ai_digest_settings'

const ALL_CATEGORIES = [
  'Productivity & Workflow',
  'Creative & Design',
  'Development & Coding',
  'Business & Analytics',
  'Research & Learning',
] as const

type CategoryName = (typeof ALL_CATEGORIES)[number]

const CATEGORY_COLORS: Record<string, string> = {
  'Productivity & Workflow': 'hsl(265 89% 72%)',
  'Creative & Design': 'hsl(326 100% 68%)',
  'Development & Coding': 'hsl(191 97% 70%)',
  'Business & Analytics': 'hsl(31 100% 65%)',
  'Research & Learning': 'hsl(135 94% 60%)',
}

const CATEGORY_BG: Record<string, string> = {
  'Productivity & Workflow': 'bg-[hsl(265,89%,72%)]/15 text-[hsl(265,89%,72%)] border-[hsl(265,89%,72%)]/20',
  'Creative & Design': 'bg-[hsl(326,100%,68%)]/15 text-[hsl(326,100%,68%)] border-[hsl(326,100%,68%)]/20',
  'Development & Coding': 'bg-[hsl(191,97%,70%)]/15 text-[hsl(191,97%,70%)] border-[hsl(191,97%,70%)]/20',
  'Business & Analytics': 'bg-[hsl(31,100%,65%)]/15 text-[hsl(31,100%,65%)] border-[hsl(31,100%,65%)]/20',
  'Research & Learning': 'bg-[hsl(135,94%,60%)]/15 text-[hsl(135,94%,60%)] border-[hsl(135,94%,60%)]/20',
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tool {
  name: string
  description: string
  url: string
  is_new: boolean
}

interface Category {
  category_name: string
  tools: Tool[]
}

interface DigestData {
  digest_date: string
  categories: Category[]
  total_tools_found: number
  summary: string
}

interface DigestEntry {
  id: string
  date: string
  timestamp: string
  categories: Category[]
  total_tools_found: number
  summary: string
}

interface UserSettings {
  categoryToggles: Record<string, boolean>
  deliveryTime: string
  timezone: string
  whatsappNumber: string
  countryCode: string
}

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

const SAMPLE_DIGEST: DigestData = {
  digest_date: new Date().toISOString().slice(0, 10),
  categories: [
    {
      category_name: 'Productivity & Workflow',
      tools: [
        { name: 'TaskPilot AI', description: 'Intelligent task prioritization and workflow automation using natural language processing.', url: 'https://taskpilot.ai', is_new: true },
        { name: 'MeetingMind', description: 'AI-powered meeting summarizer that generates action items and follow-ups automatically.', url: 'https://meetingmind.io', is_new: false },
        { name: 'FlowState', description: 'Focus tracking tool that adapts your schedule based on productivity patterns.', url: 'https://flowstate.app', is_new: true },
      ],
    },
    {
      category_name: 'Creative & Design',
      tools: [
        { name: 'PixelForge 3.0', description: 'Next-gen AI image editor with real-time style transfer and object manipulation.', url: 'https://pixelforge.design', is_new: true },
        { name: 'MotionCraft', description: 'Create professional motion graphics and animations from text prompts.', url: 'https://motioncraft.ai', is_new: false },
      ],
    },
    {
      category_name: 'Development & Coding',
      tools: [
        { name: 'CodeReview AI', description: 'Automated code review tool that catches bugs, security issues, and suggests improvements.', url: 'https://codereview.ai', is_new: true },
        { name: 'DebugLens', description: 'Visual debugging assistant that explains error traces and suggests fixes in plain language.', url: 'https://debuglens.dev', is_new: false },
        { name: 'APIForge', description: 'Generate REST and GraphQL APIs from natural language descriptions with full documentation.', url: 'https://apiforge.io', is_new: true },
      ],
    },
    {
      category_name: 'Business & Analytics',
      tools: [
        { name: 'InsightPulse', description: 'Real-time business intelligence dashboard with predictive analytics powered by AI.', url: 'https://insightpulse.co', is_new: false },
        { name: 'PitchPerfect AI', description: 'Generate investor-ready pitch decks from your business plan in minutes.', url: 'https://pitchperfect.ai', is_new: true },
      ],
    },
    {
      category_name: 'Research & Learning',
      tools: [
        { name: 'ScholarSync', description: 'AI research assistant that finds, summarizes, and cross-references academic papers.', url: 'https://scholarsync.ai', is_new: true },
        { name: 'LearnPath AI', description: 'Personalized learning roadmap generator based on your goals and current skill level.', url: 'https://learnpath.ai', is_new: false },
      ],
    },
  ],
  total_tools_found: 12,
  summary: 'Today\'s digest features 12 notable AI tools across all categories. Key highlights include TaskPilot AI for intelligent workflow automation, PixelForge 3.0\'s major update with real-time style transfer, and CodeReview AI for automated code quality analysis. Six of today\'s tools are brand new releases.',
}

// ---------------------------------------------------------------------------
// Markdown Renderer
// ---------------------------------------------------------------------------

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1.5 py-0.5 rounded bg-muted text-[13px] font-mono">{part.slice(1, -1)}</code>
    }
    return part
  })
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm leading-relaxed">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm leading-relaxed">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <HiXCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6 text-sm">{this.state.error}</p>
            <Button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <HiArrowPath className="w-4 h-4 mr-2" />
              Try again
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Helper: localStorage
// ---------------------------------------------------------------------------

function loadHistory(): DigestEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(entries: DigestEntry[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // quota exceeded or other storage error -- silently fail
  }
}

function addToHistory(digest: DigestData): DigestEntry[] {
  const existing = loadHistory()
  const entry: DigestEntry = {
    id: `digest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: digest.digest_date ?? new Date().toISOString().slice(0, 10),
    timestamp: new Date().toISOString(),
    categories: Array.isArray(digest.categories) ? digest.categories : [],
    total_tools_found: digest.total_tools_found ?? 0,
    summary: digest.summary ?? '',
  }
  const updated = [entry, ...existing].slice(0, 100)
  saveHistory(updated)
  return updated
}

function loadSettings(): UserSettings {
  const defaults: UserSettings = {
    categoryToggles: Object.fromEntries(ALL_CATEGORIES.map((c) => [c, true])),
    deliveryTime: '14:30',
    timezone: 'America/New_York',
    whatsappNumber: '',
    countryCode: '+1',
  }
  if (typeof window === 'undefined') return defaults
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    return {
      categoryToggles: parsed.categoryToggles ?? defaults.categoryToggles,
      deliveryTime: parsed.deliveryTime ?? defaults.deliveryTime,
      timezone: parsed.timezone ?? defaults.timezone,
      whatsappNumber: parsed.whatsappNumber ?? defaults.whatsappNumber,
      countryCode: parsed.countryCode ?? defaults.countryCode,
    }
  } catch {
    return defaults
  }
}

function saveSettings(settings: UserSettings) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // silently fail
  }
}

// ---------------------------------------------------------------------------
// Elapsed time hook
// ---------------------------------------------------------------------------

function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    if (!active) {
      setSeconds(0)
      return
    }
    startRef.current = Date.now()
    const tick = () => setSeconds(Math.floor((Date.now() - startRef.current) / 1000))
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [active])

  return seconds
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ToolCard({
  tool,
  categoryName,
  expanded,
  onToggle,
}: {
  tool: Tool
  categoryName: string
  expanded: boolean
  onToggle: () => void
}) {
  const badgeStyle = CATEGORY_BG[categoryName] ?? 'bg-secondary text-secondary-foreground'

  return (
    <Card
      className="border border-border bg-card shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-all duration-300 hover:border-primary/30 cursor-pointer group"
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-card-foreground truncate">{tool?.name ?? 'Untitled Tool'}</h3>
            {tool?.is_new && (
              <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0 font-bold shrink-0 border-0">NEW</Badge>
            )}
          </div>
          {tool?.url && (
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-primary transition-colors shrink-0 opacity-60 group-hover:opacity-100"
              aria-label={`Visit ${tool.name} website`}
            >
              <HiArrowTopRightOnSquare className="w-4 h-4" />
            </a>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{tool?.description ?? ''}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${badgeStyle}`}>
            {categoryName}
          </span>
          <span className="text-muted-foreground transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <HiChevronDown className="w-4 h-4" />
          </span>
        </div>
        {expanded && (
          <div className="mt-4 pt-3 border-t border-border space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="text-sm text-card-foreground leading-relaxed">{tool?.description ?? ''}</div>
            {tool?.url && (
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
              >
                Visit website <HiArrowTopRightOnSquare className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border border-border bg-card shadow-lg shadow-black/20 animate-pulse">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32 bg-muted" />
              <Skeleton className="h-4 w-10 rounded-full bg-muted" />
            </div>
            <Skeleton className="h-4 w-full bg-muted" />
            <Skeleton className="h-4 w-3/4 bg-muted" />
            <Skeleton className="h-5 w-28 rounded-full bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CategoryChips({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (cat: string) => void
}) {
  const chips = ['All', ...ALL_CATEGORIES]
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Category filter">
      {chips.map((chip) => {
        const isActive = selected === chip
        const color = chip !== 'All' ? CATEGORY_COLORS[chip] : undefined
        return (
          <button
            key={chip}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(chip)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
              isActive
                ? 'shadow-md'
                : 'border-border bg-secondary text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
            }`}
            style={
              isActive
                ? {
                    borderColor: color ?? 'hsl(265 89% 72%)',
                    color: color ?? 'hsl(265 89% 72%)',
                    backgroundColor: `${color ?? 'hsl(265 89% 72%)'}20`,
                    boxShadow: `0 2px 8px ${color ?? 'hsl(265 89% 72%)'}15`,
                  }
                : undefined
            }
          >
            {chip}
          </button>
        )
      })}
    </div>
  )
}

function AgentInfoSection({ activeAgentId }: { activeAgentId: string | null }) {
  return (
    <div className="p-4 border-t" style={{ borderColor: 'hsl(232 16% 22%)' }}>
      <p className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: 'hsl(228 10% 62%)' }}>Powered By</p>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full shrink-0 ${activeAgentId === AGENT_ID ? 'bg-accent animate-pulse' : 'bg-muted-foreground/40'}`} />
        <div className="min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: 'hsl(60 30% 96%)' }}>AI Tools Research Agent</p>
          <p className="text-[10px] truncate" style={{ color: 'hsl(228 10% 62%)' }}>Perplexity sonar-pro</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, value, label, colorClass }: { icon: React.ElementType; value: string | number; label: string; colorClass: string }) {
  return (
    <Card className="border border-border bg-card shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 transition-shadow duration-300">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground leading-none mb-0.5">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function InlineFeedback({ type, message }: { type: 'success' | 'error' | 'info'; message: string }) {
  const styles = {
    success: 'bg-accent/10 border-accent/20 text-accent',
    error: 'bg-destructive/10 border-destructive/20 text-destructive',
    info: 'bg-primary/10 border-primary/20 text-primary',
  }
  const icons = {
    success: HiCheckCircle,
    error: HiXCircle,
    info: HiInformationCircle,
  }
  const Icon = icons[type]
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${styles[type]}`} role="status">
      <Icon className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard View
// ---------------------------------------------------------------------------

function DashboardView({
  digest,
  loading,
  error,
  onGenerate,
  sampleMode,
  activeAgentId,
  settings,
}: {
  digest: DigestData | null
  loading: boolean
  error: string | null
  onGenerate: () => void
  sampleMode: boolean
  activeAgentId: string | null
  settings: UserSettings
}) {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const elapsed = useElapsedSeconds(loading)

  const displayDigest = sampleMode && !digest ? SAMPLE_DIGEST : digest

  const filteredCategories = useMemo(() => {
    if (!displayDigest) return []
    const cats = Array.isArray(displayDigest.categories) ? displayDigest.categories : []
    if (selectedCategory === 'All') return cats
    return cats.filter((c) => c?.category_name === selectedCategory)
  }, [displayDigest, selectedCategory])

  const allTools = useMemo(() => {
    const tools: { tool: Tool; categoryName: string }[] = []
    filteredCategories.forEach((cat) => {
      if (Array.isArray(cat?.tools)) {
        cat.tools.forEach((t) => tools.push({ tool: t, categoryName: cat.category_name }))
      }
    })
    return tools
  }, [filteredCategories])

  const totalTools = displayDigest?.total_tools_found ?? allTools.length
  const newToolsCount = useMemo(() => {
    if (!displayDigest) return 0
    let count = 0
    const cats = Array.isArray(displayDigest.categories) ? displayDigest.categories : []
    cats.forEach((cat) => {
      if (Array.isArray(cat?.tools)) {
        cat.tools.forEach((t) => { if (t?.is_new) count++ })
      }
    })
    return count
  }, [displayDigest])
  const dateStr = displayDigest?.digest_date ?? ''
  const enabledCount = Object.values(settings.categoryToggles).filter(Boolean).length

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Today&apos;s Digest</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {dateStr || 'No digest generated yet'}
            {loading && (
              <span className="ml-2 inline-flex items-center gap-1 text-accent text-xs">
                <HiSignal className="w-3 h-3 animate-pulse" /> Searching the web... {elapsed > 0 && `(${elapsed}s)`}
              </span>
            )}
            {!loading && sampleMode && !digest && (
              <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground text-xs">
                <HiInformationCircle className="w-3 h-3" /> Sample data
              </span>
            )}
          </p>
        </div>
        <Button
          onClick={onGenerate}
          disabled={loading}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 font-semibold px-5 min-w-[160px]"
        >
          {loading ? (
            <>
              <HiArrowPath className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <HiBolt className="w-4 h-4 mr-2" />
              Generate Now
            </>
          )}
        </Button>
      </div>

      {/* Enabled categories notice */}
      {enabledCount < ALL_CATEGORIES.length && enabledCount > 0 && (
        <InlineFeedback
          type="info"
          message={`Generating for ${enabledCount} of ${ALL_CATEGORIES.length} categories. Change in Settings.`}
        />
      )}

      {/* Stats Row */}
      {displayDigest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={FiLayers} value={totalTools} label="Total Tools" colorClass="bg-primary/15 text-primary" />
          <StatCard icon={HiSparkles} value={newToolsCount} label="New Releases" colorClass="bg-accent/15 text-accent" />
          <StatCard icon={HiFunnel} value={Array.isArray(displayDigest?.categories) ? displayDigest.categories.length : 0} label="Categories" colorClass="bg-[hsl(191,97%,70%)]/15 text-[hsl(191,97%,70%)]" />
          <StatCard icon={HiCalendarDays} value={dateStr ? dateStr.slice(5) : '--'} label="Digest Date" colorClass="bg-[hsl(31,100%,65%)]/15 text-[hsl(31,100%,65%)]" />
        </div>
      )}

      {/* Summary */}
      {displayDigest?.summary && (
        <Card className="border border-border bg-card shadow-lg shadow-black/20">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <HiSparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="text-sm text-card-foreground leading-relaxed flex-1">
                {renderMarkdown(displayDigest.summary)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <HiXCircle className="w-5 h-5 text-destructive shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-destructive font-medium">Generation Failed</p>
              <p className="text-xs text-destructive/80 mt-0.5 break-words">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onGenerate} className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Category Filter */}
      {displayDigest && (
        <CategoryChips selected={selectedCategory} onSelect={setSelectedCategory} />
      )}

      {/* Loading */}
      {loading && <SkeletonCards />}

      {/* Tool Cards */}
      {!loading && displayDigest && allTools.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allTools.map((item, idx) => {
            const key = `${item.tool?.name ?? ''}-${item.categoryName}-${idx}`
            return (
              <ToolCard
                key={key}
                tool={item.tool}
                categoryName={item.categoryName}
                expanded={expandedCard === key}
                onToggle={() => setExpandedCard(expandedCard === key ? null : key)}
              />
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !displayDigest && !error && (
        <Card className="border border-dashed border-border bg-card/50 shadow-lg shadow-black/10">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FiCpu className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Digest Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Click &quot;Generate Now&quot; to search the web for the latest AI tools and compile today&apos;s categorized digest.
            </p>
            <Button onClick={onGenerate} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
              <HiBolt className="w-4 h-4 mr-2" />
              Generate First Digest
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No results for filter */}
      {!loading && displayDigest && allTools.length === 0 && (
        <Card className="border border-dashed border-border bg-card/50">
          <CardContent className="p-8 text-center">
            <HiFunnel className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tools found in &quot;{selectedCategory}&quot; for this digest.</p>
            <Button variant="ghost" size="sm" className="mt-3 text-primary" onClick={() => setSelectedCategory('All')}>
              Show all categories
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// History View
// ---------------------------------------------------------------------------

function HistoryView({ history, sampleMode }: { history: DigestEntry[]; sampleMode: boolean }) {
  const [search, setSearch] = useState('')
  const [openDates, setOpenDates] = useState<Set<string>>(new Set())
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  useEffect(() => {
    if (history.length > 0) {
      setOpenDates(new Set([history[0].date]))
    }
  }, [history])

  useEffect(() => {
    let cancelled = false
    async function fetchLogs() {
      setLogsLoading(true)
      try {
        const result = await getScheduleLogs(SCHEDULE_ID, { limit: 20 })
        if (!cancelled && result.success && Array.isArray(result.executions)) {
          setExecutionLogs(result.executions)
        }
      } catch {
        // ignore -- non-critical
      }
      if (!cancelled) setLogsLoading(false)
    }
    fetchLogs()
    return () => { cancelled = true }
  }, [])

  const displayHistory = sampleMode && history.length === 0
    ? [
        {
          id: 'sample-1',
          date: new Date().toISOString().slice(0, 10),
          timestamp: new Date().toISOString(),
          categories: SAMPLE_DIGEST.categories,
          total_tools_found: SAMPLE_DIGEST.total_tools_found,
          summary: SAMPLE_DIGEST.summary,
        },
        {
          id: 'sample-2',
          date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          categories: SAMPLE_DIGEST.categories.slice(0, 3),
          total_tools_found: 8,
          summary: 'Yesterday\'s digest featured 8 tools with highlights in coding and design categories.',
        },
      ]
    : history

  const filtered = useMemo(() => {
    if (!search.trim()) return displayHistory
    const q = search.toLowerCase()
    return displayHistory.filter((entry) => {
      if (entry.date?.toLowerCase().includes(q)) return true
      if (entry.summary?.toLowerCase().includes(q)) return true
      const cats = Array.isArray(entry.categories) ? entry.categories : []
      return cats.some((c) => {
        if (c?.category_name?.toLowerCase().includes(q)) return true
        const tools = Array.isArray(c?.tools) ? c.tools : []
        return tools.some((t) => t?.name?.toLowerCase().includes(q) || t?.description?.toLowerCase().includes(q))
      })
    })
  }, [displayHistory, search])

  const grouped = useMemo(() => {
    const g: Record<string, DigestEntry[]> = {}
    filtered.forEach((entry) => {
      const date = entry.date ?? 'Unknown'
      if (!g[date]) g[date] = []
      g[date].push(entry)
    })
    return g
  }, [filtered])
  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const toggleDate = (date: string) => {
    setOpenDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  const totalToolsForDate = (entries: DigestEntry[]) => entries.reduce((sum, e) => sum + (e.total_tools_found ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Digest History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Browse and search past AI tool digests</p>
      </div>

      {/* Search */}
      <div className="relative">
        <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search tools, categories, dates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9 bg-card border-border"
          aria-label="Search digest history"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <HiXMark className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Execution Logs Quick View */}
      {executionLogs.length > 0 && (
        <Card className="border border-border bg-card shadow-lg shadow-black/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HiClock className="w-4 h-4 text-primary" />
              Recent Schedule Runs
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-1.5">
              {executionLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    {log.success ? (
                      <HiCheckCircle className="w-3.5 h-3.5 text-accent" />
                    ) : (
                      <HiXCircle className="w-3.5 h-3.5 text-destructive" />
                    )}
                    <span className="text-muted-foreground">{log.executed_at ? new Date(log.executed_at).toLocaleString() : 'Unknown time'}</span>
                  </div>
                  <Badge variant={log.success ? 'default' : 'destructive'} className={`text-[10px] ${log.success ? 'bg-accent/20 text-accent border-0' : ''}`}>
                    {log.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {logsLoading && (
        <Card className="border border-border bg-card shadow-lg shadow-black/20">
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-4 w-40 bg-muted" />
            <Skeleton className="h-3 w-full bg-muted" />
            <Skeleton className="h-3 w-3/4 bg-muted" />
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      {dateKeys.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{dateKeys.length} day{dateKeys.length !== 1 ? 's' : ''} of digests</span>
          <span>{filtered.length} total digest{filtered.length !== 1 ? 's' : ''}</span>
          {search && <span>Filtered by &quot;{search}&quot;</span>}
        </div>
      )}

      {/* Empty State */}
      {dateKeys.length === 0 && !logsLoading && (
        <Card className="border border-dashed border-border bg-card/50">
          <CardContent className="p-8 text-center">
            <HiClock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? `No digests match "${search}".` : 'No digest history yet. Generate your first digest from the Dashboard.'}
            </p>
            {search && (
              <Button variant="ghost" size="sm" className="mt-2 text-primary" onClick={() => setSearch('')}>
                Clear search
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Date Groups */}
      {dateKeys.map((date) => {
        const entries = grouped[date]
        const isOpen = openDates.has(date)
        return (
          <Collapsible key={date} open={isOpen} onOpenChange={() => toggleDate(date)}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors shadow-md shadow-black/10">
                <div className="flex items-center gap-3">
                  <HiCalendarDays className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{date}</span>
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                    {totalToolsForDate(entries)} tools
                  </Badge>
                </div>
                <span className="text-muted-foreground transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <HiChevronDown className="w-4 h-4" />
                </span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 space-y-4">
                {entries.map((entry) => (
                  <div key={entry.id} className="space-y-3">
                    {entry.summary && (
                      <Card className="border border-border bg-card/70 shadow-md shadow-black/10">
                        <CardContent className="p-4 text-sm text-muted-foreground">
                          {renderMarkdown(entry.summary)}
                        </CardContent>
                      </Card>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {Array.isArray(entry.categories) &&
                        entry.categories.map((cat) =>
                          Array.isArray(cat?.tools)
                            ? cat.tools.map((tool, tidx) => {
                                const key = `${entry.id}-${cat.category_name}-${tidx}`
                                return (
                                  <ToolCard
                                    key={key}
                                    tool={tool}
                                    categoryName={cat.category_name}
                                    expanded={expandedCard === key}
                                    onToggle={() => setExpandedCard(expandedCard === key ? null : key)}
                                  />
                                )
                              })
                            : null
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Settings View
// ---------------------------------------------------------------------------

function SettingsView({
  settings,
  onSave,
}: {
  settings: UserSettings
  onSave: (s: UserSettings) => void
}) {
  const [categoryToggles, setCategoryToggles] = useState<Record<string, boolean>>(settings.categoryToggles)
  const [deliveryTime, setDeliveryTime] = useState(settings.deliveryTime)
  const [timezone, setTimezone] = useState(settings.timezone)
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber)
  const [countryCode, setCountryCode] = useState(settings.countryCode)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Schedule management
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [toggleLoading, setToggleLoading] = useState(false)

  const loadScheduleData = useCallback(async () => {
    setScheduleLoading(true)
    setScheduleError(null)
    try {
      const result = await listSchedules()
      if (result.success && Array.isArray(result.schedules)) {
        const found = result.schedules.find((s) => s.id === SCHEDULE_ID)
        setSchedule(found ?? result.schedules[0] ?? null)
      } else {
        setScheduleError(result.error ?? 'Failed to load schedule')
      }
    } catch {
      setScheduleError('Network error loading schedule')
    }
    setScheduleLoading(false)
  }, [])

  useEffect(() => {
    loadScheduleData()
  }, [loadScheduleData])

  const handleToggleSchedule = async () => {
    if (!schedule) return
    setToggleLoading(true)
    setScheduleError(null)
    try {
      if (schedule.is_active) {
        await pauseSchedule(schedule.id)
      } else {
        await resumeSchedule(schedule.id)
      }
      await loadScheduleData()
    } catch {
      setScheduleError('Failed to toggle schedule')
    }
    setToggleLoading(false)
  }

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(categoryToggles) !== JSON.stringify(settings.categoryToggles) ||
      deliveryTime !== settings.deliveryTime ||
      timezone !== settings.timezone ||
      whatsappNumber !== settings.whatsappNumber ||
      countryCode !== settings.countryCode
    )
  }, [categoryToggles, deliveryTime, timezone, whatsappNumber, countryCode, settings])

  const handleSave = () => {
    setSaveStatus('saving')
    setTimeout(() => {
      try {
        const newSettings: UserSettings = {
          categoryToggles,
          deliveryTime,
          timezone,
          whatsappNumber,
          countryCode,
        }
        saveSettings(newSettings)
        onSave(newSettings)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      } catch {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    }, 400)
  }

  const timezones = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris',
    'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata',
    'Asia/Dubai', 'Asia/Singapore', 'Australia/Sydney', 'UTC',
  ]

  const enabledCount = Object.values(categoryToggles).filter(Boolean).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure your digest preferences and schedule</p>
      </div>

      {/* Schedule Management */}
      <Card className="border border-border bg-card shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HiCalendarDays className="w-5 h-5 text-primary" />
            Schedule Management
          </CardTitle>
          <CardDescription className="text-muted-foreground">Manage automatic daily digest generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scheduleLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-40 bg-muted" />
              <Skeleton className="h-4 w-64 bg-muted" />
              <Skeleton className="h-9 w-32 bg-muted" />
            </div>
          ) : scheduleError ? (
            <div className="space-y-2">
              <InlineFeedback type="error" message={scheduleError} />
              <Button variant="outline" size="sm" onClick={loadScheduleData}>
                <HiArrowPath className="w-3.5 h-3.5 mr-1.5" /> Retry
              </Button>
            </div>
          ) : schedule ? (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">Schedule Status</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${schedule.is_active ? 'bg-accent animate-pulse' : 'bg-muted-foreground/40'}`} />
                    <span className={`text-xs font-medium ${schedule.is_active ? 'text-accent' : 'text-muted-foreground'}`}>
                      {schedule.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleSchedule}
                  disabled={toggleLoading}
                  className={`gap-2 ${schedule.is_active ? 'border-destructive/30 text-destructive hover:bg-destructive/10' : 'border-accent/30 text-accent hover:bg-accent/10'}`}
                >
                  {toggleLoading ? (
                    <HiArrowPath className="w-4 h-4 animate-spin" />
                  ) : schedule.is_active ? (
                    <HiPause className="w-4 h-4" />
                  ) : (
                    <HiPlay className="w-4 h-4" />
                  )}
                  {schedule.is_active ? 'Pause' : 'Resume'}
                </Button>
              </div>
              <Separator className="bg-border" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Frequency</p>
                  <p className="text-foreground font-medium">{schedule.cron_expression ? cronToHuman(schedule.cron_expression) : 'Not set'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Timezone</p>
                  <p className="text-foreground font-medium">{schedule.timezone ?? 'UTC'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Next Run</p>
                  <p className="text-foreground font-medium">{schedule.next_run_time ? new Date(schedule.next_run_time).toLocaleString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Last Run</p>
                  <p className="text-foreground font-medium">
                    {schedule.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : 'Never'}
                    {schedule.last_run_success !== null && (
                      <span className="ml-1.5">
                        {schedule.last_run_success ? (
                          <HiCheckCircle className="inline w-3.5 h-3.5 text-accent" />
                        ) : (
                          <HiXCircle className="inline w-3.5 h-3.5 text-destructive" />
                        )}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No schedule found for this agent.</p>
          )}
        </CardContent>
      </Card>

      {/* Category Preferences */}
      <Card className="border border-border bg-card shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HiFunnel className="w-5 h-5 text-primary" />
            Category Preferences
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {enabledCount} of {ALL_CATEGORIES.length} categories enabled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {ALL_CATEGORIES.map((cat) => (
            <div key={cat} className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat] ?? 'hsl(265 89% 72%)' }} />
                <Label htmlFor={`cat-${cat}`} className="text-sm text-foreground cursor-pointer select-none">{cat}</Label>
              </div>
              <Switch
                id={`cat-${cat}`}
                checked={categoryToggles[cat] ?? true}
                onCheckedChange={(checked) => setCategoryToggles((prev) => ({ ...prev, [cat]: checked }))}
              />
            </div>
          ))}
          {enabledCount === 0 && (
            <InlineFeedback type="error" message="At least one category must be enabled for digest generation." />
          )}
        </CardContent>
      </Card>

      {/* Delivery Preferences */}
      <Card className="border border-border bg-card shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HiClock className="w-5 h-5 text-primary" />
            Delivery Preferences
          </CardTitle>
          <CardDescription className="text-muted-foreground">Set when and how you receive your digest</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery-time" className="text-sm">Delivery Time</Label>
              <Input
                id="delivery-time"
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone-select" className="text-sm">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone-select" className="bg-secondary border-border">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator className="bg-border" />
          <div className="space-y-2">
            <Label className="text-sm">WhatsApp Notifications</Label>
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-24 bg-secondary border-border shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['+1', '+44', '+91', '+49', '+33', '+81', '+86', '+61', '+65', '+971'].map((code) => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Phone number"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^\d]/g, ''))}
                className="bg-secondary border-border"
                inputMode="tel"
              />
            </div>
            <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg bg-muted/30 border border-border/50">
              <HiInformationCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                WhatsApp delivery requires a custom integration (Twilio or WhatsApp Business API) configured in Lyzr Studio. Your number will be saved and ready for use once configured.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={handleSave}
          disabled={saveStatus === 'saving' || enabledCount === 0}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 font-semibold px-6"
        >
          {saveStatus === 'saving' ? (
            <>
              <HiArrowPath className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saveStatus === 'saved' ? (
            <>
              <HiCheckCircle className="w-4 h-4 mr-2" />
              Saved
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
        {hasChanges && saveStatus === 'idle' && (
          <span className="text-xs text-muted-foreground">Unsaved changes</span>
        )}
        {saveStatus === 'error' && (
          <InlineFeedback type="error" message="Failed to save. Please try again." />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function Page() {
  const [activeView, setActiveView] = useState<'dashboard' | 'history' | 'settings'>('dashboard')
  const [sampleMode, setSampleMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Dashboard state
  const [digest, setDigest] = useState<DigestData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [history, setHistory] = useState<DigestEntry[]>([])
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings())

  // Load history and last digest on mount
  useEffect(() => {
    const h = loadHistory()
    setHistory(h)
    // Auto-load the most recent digest if available
    if (h.length > 0) {
      const latest = h[0]
      setDigest({
        digest_date: latest.date,
        categories: Array.isArray(latest.categories) ? latest.categories : [],
        total_tools_found: latest.total_tools_found ?? 0,
        summary: latest.summary ?? '',
      })
    }
    setSettings(loadSettings())
  }, [])

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setError(null)
    setActiveAgentId(AGENT_ID)
    try {
      const enabledCategories = ALL_CATEGORIES.filter((c) => settings.categoryToggles[c] !== false)
      if (enabledCategories.length === 0) {
        setError('No categories enabled. Please enable at least one category in Settings.')
        setLoading(false)
        setActiveAgentId(null)
        return
      }
      const todayStr = new Date().toISOString().slice(0, 10)
      const message = `TODAY IS ${todayStr}. Search the LIVE web RIGHT NOW for the very latest AI tool releases, product launches, updates, and noteworthy tools from today (${todayStr}) and the past 24-48 hours. You MUST perform real-time web searches — do NOT use cached or training data. Check Product Hunt, TechCrunch, The Verge, Hacker News, and AI blogs for today's launches. Cover these categories: ${enabledCategories.join(', ')}. Return a structured JSON digest with digest_date, categories (each with category_name and tools array), total_tools_found, and summary. Each tool needs: name, description, url, is_new (boolean). Aim for 10-15 total tools.`
      const result = await callAIAgent(message, AGENT_ID)
      if (result.success) {
        // Try multiple paths to extract data — agent may return at different nesting levels
        let data: Record<string, unknown> | undefined
        const r = result?.response
        if (r?.result && typeof r.result === 'object' && !Array.isArray(r.result)) {
          data = r.result as Record<string, unknown>
        } else if (r && typeof r === 'object') {
          // Check if result itself contains digest fields
          const rAny = r as Record<string, unknown>
          if (rAny.digest_date || rAny.categories) {
            data = rAny
          }
        }
        // If data is a string (sometimes agents return JSON as string), try parsing it
        if (!data && r?.result && typeof r.result === 'string') {
          try {
            const parsed = JSON.parse(r.result)
            if (parsed && typeof parsed === 'object') data = parsed
          } catch {
            // not parseable JSON string
          }
        }
        // Also check result.response.message for stringified JSON
        if (!data && r?.message && typeof r.message === 'string') {
          try {
            const parsed = JSON.parse(r.message)
            if (parsed && typeof parsed === 'object' && (parsed.digest_date || parsed.categories)) {
              data = parsed
            }
          } catch {
            // not JSON
          }
        }
        if (data) {
          const categories = Array.isArray(data.categories) ? (data.categories as Category[]) : []
          // Sanitize categories — ensure each has tools array
          const cleanCategories = categories
            .filter((c): c is Category => c != null && typeof c === 'object' && typeof c.category_name === 'string')
            .map((c) => ({
              ...c,
              tools: Array.isArray(c.tools) ? c.tools.filter((t): t is Tool => t != null && typeof t === 'object' && typeof t.name === 'string') : [],
            }))
            .filter((c) => c.tools.length > 0)
          const totalTools = cleanCategories.reduce((sum, c) => sum + c.tools.length, 0)
          const digestData: DigestData = {
            digest_date: (data.digest_date as string) ?? todayStr,
            categories: cleanCategories,
            total_tools_found: typeof data.total_tools_found === 'number' ? data.total_tools_found : totalTools,
            summary: (data.summary as string) ?? '',
          }
          if (cleanCategories.length === 0) {
            setError('Agent returned a response but no tools were found. The agent may not have found recent AI tool news. Try again in a few moments.')
          } else {
            setDigest(digestData)
            const updatedHistory = addToHistory(digestData)
            setHistory(updatedHistory)
          }
        } else {
          // Last resort: check if there's a text message we can show
          const fallbackMsg = r?.message ?? r?.result
          setError(
            typeof fallbackMsg === 'string' && fallbackMsg.length > 0
              ? `Agent returned unstructured response: ${fallbackMsg.slice(0, 200)}`
              : 'Agent returned an empty or unrecognized response. Please try again.'
          )
        }
      } else {
        setError(result?.error ?? 'Unknown error occurred. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Check your connection and try again.')
    }
    setLoading(false)
    setActiveAgentId(null)
  }, [settings])

  const handleSettingsSave = useCallback((newSettings: UserSettings) => {
    setSettings(newSettings)
  }, [])

  const handleClearHistory = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      setHistory([])
    }
  }, [])

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: HiHome },
    { id: 'history' as const, label: 'History', icon: HiClock, badge: history.length > 0 ? history.length : undefined },
    { id: 'settings' as const, label: 'Settings', icon: HiCog6Tooth },
  ]

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-60 flex flex-col border-r transition-transform duration-300 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ backgroundColor: 'hsl(231 18% 12%)', borderColor: 'hsl(232 16% 22%)' }}
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <div className="p-5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                <HiSparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight" style={{ color: 'hsl(60 30% 96%)' }}>AI Tools</h2>
                <p className="text-[11px] font-medium" style={{ color: 'hsl(228 10% 62%)' }}>Daily Digest</p>
              </div>
            </div>
          </div>

          <Separator style={{ backgroundColor: 'hsl(232 16% 22%)' }} />

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = activeView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id)
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive ? 'shadow-md shadow-primary/20' : 'hover:bg-[hsl(232,16%,20%)]'
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: 'hsl(265 89% 72%)', color: 'hsl(0 0% 100%)' }
                      : { color: 'hsl(60 30% 96%)' }
                  }
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-muted'}`}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Bottom controls */}
          <div className="space-y-0">
            {/* Sample Data Toggle */}
            <div className="px-4 py-3 border-t" style={{ borderColor: 'hsl(232 16% 22%)' }}>
              <div className="flex items-center justify-between">
                <Label htmlFor="sample-toggle" className="text-xs cursor-pointer select-none" style={{ color: 'hsl(228 10% 62%)' }}>
                  Sample Data
                </Label>
                <Switch
                  id="sample-toggle"
                  checked={sampleMode}
                  onCheckedChange={setSampleMode}
                />
              </div>
            </div>

            {/* Clear history */}
            {history.length > 0 && (
              <div className="px-4 py-2 border-t" style={{ borderColor: 'hsl(232 16% 22%)' }}>
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-2 text-[11px] hover:text-destructive transition-colors w-full"
                  style={{ color: 'hsl(228 10% 62%)' }}
                >
                  <HiTrash className="w-3.5 h-3.5" />
                  Clear history ({history.length})
                </button>
              </div>
            )}

            {/* Agent Info */}
            <AgentInfoSection activeAgentId={activeAgentId} />
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Mobile Header */}
          <div className="lg:hidden sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border p-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Open navigation"
            >
              <HiBars3 className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <HiSparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">AI Tools Daily Digest</span>
            </div>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              {activeView === 'dashboard' && (
                <DashboardView
                  digest={digest}
                  loading={loading}
                  error={error}
                  onGenerate={handleGenerate}
                  sampleMode={sampleMode}
                  activeAgentId={activeAgentId}
                  settings={settings}
                />
              )}
              {activeView === 'history' && <HistoryView history={history} sampleMode={sampleMode} />}
              {activeView === 'settings' && <SettingsView settings={settings} onSave={handleSettingsSave} />}
            </div>
          </ScrollArea>
        </main>
      </div>
    </ErrorBoundary>
  )
}
