'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
import { HiHome, HiClock, HiCog6Tooth, HiMagnifyingGlass, HiArrowTopRightOnSquare, HiSparkles, HiChevronDown, HiChevronUp, HiArrowPath, HiBolt, HiCheckCircle, HiXCircle, HiSignal, HiPause, HiPlay, HiCalendarDays, HiFunnel, HiBars3 } from 'react-icons/hi2'
import { FiCpu, FiLayers } from 'react-icons/fi'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENT_ID = '69996db3771423cce61cd169'
const SCHEDULE_ID = '69996db9399dfadeac37e3e6'
const STORAGE_KEY = 'ai_tools_digest_history'

const ALL_CATEGORIES = [
  'Productivity & Workflow',
  'Creative & Design',
  'Development & Coding',
  'Business & Analytics',
  'Research & Learning',
]

const CATEGORY_COLORS: Record<string, string> = {
  'Productivity & Workflow': 'hsl(265 89% 72%)',
  'Creative & Design': 'hsl(326 100% 68%)',
  'Development & Coding': 'hsl(191 97% 70%)',
  'Business & Analytics': 'hsl(31 100% 65%)',
  'Research & Learning': 'hsl(135 94% 60%)',
}

const CATEGORY_BG: Record<string, string> = {
  'Productivity & Workflow': 'bg-[hsl(265,89%,72%)]/15 text-[hsl(265,89%,72%)]',
  'Creative & Design': 'bg-[hsl(326,100%,68%)]/15 text-[hsl(326,100%,68%)]',
  'Development & Coding': 'bg-[hsl(191,97%,70%)]/15 text-[hsl(191,97%,70%)]',
  'Business & Analytics': 'bg-[hsl(31,100%,65%)]/15 text-[hsl(31,100%,65%)]',
  'Research & Learning': 'bg-[hsl(135,94%,60%)]/15 text-[hsl(135,94%,60%)]',
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

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

const SAMPLE_DIGEST: DigestData = {
  digest_date: '2026-02-21',
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

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm">
            {formatInline(line)}
          </p>
        )
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
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
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
    // ignore
  }
}

function addToHistory(digest: DigestData) {
  const existing = loadHistory()
  const entry: DigestEntry = {
    id: `digest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: digest.digest_date ?? new Date().toISOString().slice(0, 10),
    timestamp: new Date().toISOString(),
    categories: Array.isArray(digest.categories) ? digest.categories : [],
    total_tools_found: digest.total_tools_found ?? 0,
    summary: digest.summary ?? '',
  }
  const updated = [entry, ...existing].slice(0, 50)
  saveHistory(updated)
  return updated
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
    <Card className="border border-border bg-card shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-all duration-300 hover:border-primary/30 cursor-pointer" onClick={onToggle}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-card-foreground truncate">{tool?.name ?? 'Untitled Tool'}</h3>
            {tool?.is_new && (
              <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0 font-bold shrink-0">NEW</Badge>
            )}
          </div>
          {tool?.url && (
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-primary transition-colors shrink-0"
            >
              <HiArrowTopRightOnSquare className="w-4 h-4" />
            </a>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{tool?.description ?? ''}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${badgeStyle}`}>
            {categoryName}
          </span>
          <span className="text-muted-foreground">
            {expanded ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
          </span>
        </div>
        {expanded && (
          <div className="mt-4 pt-3 border-t border-border space-y-2">
            <div className="text-sm text-card-foreground">{renderMarkdown(tool?.description ?? '')}</div>
            {tool?.url && (
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
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

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border border-border bg-card shadow-lg shadow-black/20">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-28 rounded-full" />
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
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const isActive = selected === chip
        const color = chip !== 'All' ? CATEGORY_COLORS[chip] : undefined
        return (
          <button
            key={chip}
            onClick={() => onSelect(chip)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${isActive ? 'border-primary bg-primary/20 text-primary shadow-md shadow-primary/10' : 'border-border bg-secondary text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'}`}
            style={isActive && color ? { borderColor: color, color: color, backgroundColor: `${color}20` } : undefined}
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
    <div className="p-4 border-t border-border">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Powered By</p>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full shrink-0 ${activeAgentId === AGENT_ID ? 'bg-accent animate-pulse' : 'bg-muted-foreground/40'}`} />
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground truncate">AI Tools Research Agent</p>
          <p className="text-[10px] text-muted-foreground truncate">Web search & digest compilation</p>
        </div>
      </div>
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
}: {
  digest: DigestData | null
  loading: boolean
  error: string | null
  onGenerate: () => void
  sampleMode: boolean
  activeAgentId: string | null
}) {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  const displayDigest = sampleMode && !digest ? SAMPLE_DIGEST : digest

  const filteredCategories = React.useMemo(() => {
    if (!displayDigest) return []
    const cats = Array.isArray(displayDigest.categories) ? displayDigest.categories : []
    if (selectedCategory === 'All') return cats
    return cats.filter((c) => c?.category_name === selectedCategory)
  }, [displayDigest, selectedCategory])

  const allTools = React.useMemo(() => {
    const tools: { tool: Tool; categoryName: string }[] = []
    filteredCategories.forEach((cat) => {
      if (Array.isArray(cat?.tools)) {
        cat.tools.forEach((t) => tools.push({ tool: t, categoryName: cat.category_name }))
      }
    })
    return tools
  }, [filteredCategories])

  const totalTools = displayDigest?.total_tools_found ?? allTools.length
  const newToolsCount = allTools.filter((t) => t.tool?.is_new).length
  const dateStr = displayDigest?.digest_date ?? ''

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Today&apos;s Digest</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {dateStr ? `${dateStr}` : 'No digest generated yet'}
            {activeAgentId === AGENT_ID && (
              <span className="ml-2 inline-flex items-center gap-1 text-accent text-xs">
                <HiSignal className="w-3 h-3 animate-pulse" /> Agent working...
              </span>
            )}
          </p>
        </div>
        <Button
          onClick={onGenerate}
          disabled={loading}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 font-semibold px-5"
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

      {/* Stats Row */}
      {displayDigest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border border-border bg-card shadow-lg shadow-black/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <FiLayers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalTools}</p>
                <p className="text-xs text-muted-foreground">Total Tools</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card shadow-lg shadow-black/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <HiSparkles className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{newToolsCount}</p>
                <p className="text-xs text-muted-foreground">New Releases</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card shadow-lg shadow-black/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(191,97%,70%)]/15 flex items-center justify-center">
                <HiFunnel className="w-5 h-5 text-[hsl(191,97%,70%)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{Array.isArray(displayDigest?.categories) ? displayDigest.categories.length : 0}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card shadow-lg shadow-black/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(31,100%,65%)]/15 flex items-center justify-center">
                <HiCalendarDays className="w-5 h-5 text-[hsl(31,100%,65%)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{dateStr ? dateStr.slice(5) : '--'}</p>
                <p className="text-xs text-muted-foreground">Digest Date</p>
              </div>
            </CardContent>
          </Card>
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
              <div className="text-sm text-card-foreground leading-relaxed">
                {renderMarkdown(displayDigest.summary)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border border-destructive/50 bg-destructive/10">
          <CardContent className="p-4 flex items-center gap-3">
            <HiXCircle className="w-5 h-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-destructive font-medium">Generation Failed</p>
              <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
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
      {!loading && displayDigest && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allTools.map((item, idx) => {
            const key = `${item.tool?.name ?? ''}-${idx}`
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
            <p className="text-sm text-muted-foreground">No tools found for &quot;{selectedCategory}&quot; in this digest.</p>
            <Button variant="ghost" size="sm" className="mt-2 text-primary" onClick={() => setSelectedCategory('All')}>
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

function HistoryView({ sampleMode }: { sampleMode: boolean }) {
  const [history, setHistory] = useState<DigestEntry[]>([])
  const [search, setSearch] = useState('')
  const [openDates, setOpenDates] = useState<Set<string>>(new Set())
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  useEffect(() => {
    const h = loadHistory()
    setHistory(h)
    if (h.length > 0) {
      setOpenDates(new Set([h[0].date]))
    }
  }, [])

  useEffect(() => {
    async function fetchLogs() {
      setLogsLoading(true)
      try {
        const result = await getScheduleLogs(SCHEDULE_ID, { limit: 20 })
        if (result.success && Array.isArray(result.executions)) {
          setExecutionLogs(result.executions)
        }
      } catch {
        // ignore
      }
      setLogsLoading(false)
    }
    fetchLogs()
  }, [])

  const displayHistory = sampleMode && history.length === 0
    ? [
        {
          id: 'sample-1',
          date: '2026-02-21',
          timestamp: '2026-02-21T14:30:00Z',
          categories: SAMPLE_DIGEST.categories,
          total_tools_found: SAMPLE_DIGEST.total_tools_found,
          summary: SAMPLE_DIGEST.summary,
        },
        {
          id: 'sample-2',
          date: '2026-02-20',
          timestamp: '2026-02-20T14:30:00Z',
          categories: SAMPLE_DIGEST.categories.slice(0, 3),
          total_tools_found: 8,
          summary: 'Yesterday\'s digest featured 8 tools with highlights in coding and design categories.',
        },
      ]
    : history

  const filtered = displayHistory.filter((entry) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    if (entry.date?.toLowerCase().includes(q)) return true
    if (entry.summary?.toLowerCase().includes(q)) return true
    const cats = Array.isArray(entry.categories) ? entry.categories : []
    return cats.some((c) => {
      if (c?.category_name?.toLowerCase().includes(q)) return true
      const tools = Array.isArray(c?.tools) ? c.tools : []
      return tools.some((t) => t?.name?.toLowerCase().includes(q) || t?.description?.toLowerCase().includes(q))
    })
  })

  const grouped: Record<string, DigestEntry[]> = {}
  filtered.forEach((entry) => {
    const date = entry.date ?? 'Unknown'
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(entry)
  })
  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const toggleDate = (date: string) => {
    setOpenDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  const totalToolsForDate = (entries: DigestEntry[]) => {
    return entries.reduce((sum, e) => sum + (e.total_tools_found ?? 0), 0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Digest History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Browse past AI tool digests</p>
      </div>

      {/* Search */}
      <div className="relative">
        <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tools, categories, dates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border"
        />
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
                <div key={log.id} className="flex items-center justify-between text-xs py-1">
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
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </CardContent>
        </Card>
      )}

      {/* Date Groups */}
      {dateKeys.length === 0 && !logsLoading && (
        <Card className="border border-dashed border-border bg-card/50">
          <CardContent className="p-8 text-center">
            <HiClock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No digests match your search.' : 'No digest history yet. Generate your first digest from the Dashboard.'}
            </p>
          </CardContent>
        </Card>
      )}

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
                {isOpen ? <HiChevronUp className="w-4 h-4 text-muted-foreground" /> : <HiChevronDown className="w-4 h-4 text-muted-foreground" />}
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

function SettingsView() {
  const [categoryToggles, setCategoryToggles] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    ALL_CATEGORIES.forEach((c) => (map[c] = true))
    return map
  })
  const [deliveryTime, setDeliveryTime] = useState('14:30')
  const [timezone, setTimezone] = useState('America/New_York')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [countryCode, setCountryCode] = useState('+1')
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
        if (found) {
          setSchedule(found)
        } else if (result.schedules.length > 0) {
          setSchedule(result.schedules[0])
        }
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

  const handleSave = () => {
    setSaveStatus('saving')
    setTimeout(() => {
      try {
        if (typeof window !== 'undefined') {
          const settings = {
            categoryToggles,
            deliveryTime,
            timezone,
            whatsappNumber: whatsappNumber ? `${countryCode}${whatsappNumber}` : '',
          }
          localStorage.setItem('ai_digest_settings', JSON.stringify(settings))
        }
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    }, 600)
  }

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
    'UTC',
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure your digest preferences</p>
      </div>

      {/* Schedule Management */}
      <Card className="border border-border bg-card shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HiCalendarDays className="w-5 h-5 text-primary" />
            Schedule Management
          </CardTitle>
          <CardDescription className="text-muted-foreground">Manage automatic digest generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scheduleLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-9 w-32" />
            </div>
          ) : scheduleError ? (
            <div className="flex items-center gap-3 text-sm">
              <HiXCircle className="w-5 h-5 text-destructive" />
              <span className="text-destructive">{scheduleError}</span>
              <Button variant="outline" size="sm" onClick={loadScheduleData}>Retry</Button>
            </div>
          ) : schedule ? (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">Schedule Status</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${schedule.is_active ? 'bg-accent' : 'bg-muted-foreground/40'}`} />
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
                  {schedule.is_active ? 'Pause Schedule' : 'Resume Schedule'}
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
            <p className="text-sm text-muted-foreground">No schedule found.</p>
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
          <CardDescription className="text-muted-foreground">Toggle categories to include in your digest</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ALL_CATEGORIES.map((cat) => (
            <div key={cat} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] ?? 'hsl(265 89% 72%)' }} />
                <Label htmlFor={`cat-${cat}`} className="text-sm text-foreground cursor-pointer">{cat}</Label>
              </div>
              <Switch
                id={`cat-${cat}`}
                checked={categoryToggles[cat] ?? true}
                onCheckedChange={(checked) => setCategoryToggles((prev) => ({ ...prev, [cat]: checked }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Delivery Schedule */}
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
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator className="bg-border" />
          <div className="space-y-2">
            <Label className="text-sm">WhatsApp Notifications (Optional)</Label>
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-24 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="+1">+1</SelectItem>
                  <SelectItem value="+44">+44</SelectItem>
                  <SelectItem value="+91">+91</SelectItem>
                  <SelectItem value="+49">+49</SelectItem>
                  <SelectItem value="+33">+33</SelectItem>
                  <SelectItem value="+81">+81</SelectItem>
                  <SelectItem value="+86">+86</SelectItem>
                  <SelectItem value="+61">+61</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Phone number"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Receive daily digest summaries via WhatsApp</p>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
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
        {saveStatus === 'error' && (
          <span className="text-xs text-destructive">Failed to save. Please try again.</span>
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

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setActiveAgentId(AGENT_ID)
    try {
      const enabledCategories = ALL_CATEGORIES.filter(() => true)
      const message = `Search the web for the latest AI tool releases, updates, and noteworthy tools from today. Cover all categories: ${enabledCategories.join(', ')}. Compile a comprehensive categorized digest.`
      const result = await callAIAgent(message, AGENT_ID)
      if (result.success) {
        const data = result?.response?.result as DigestData | undefined
        if (data) {
          const digestData: DigestData = {
            digest_date: data.digest_date ?? new Date().toISOString().slice(0, 10),
            categories: Array.isArray(data.categories) ? data.categories : [],
            total_tools_found: data.total_tools_found ?? 0,
            summary: data.summary ?? '',
          }
          setDigest(digestData)
          addToHistory(digestData)
        } else {
          setError('Agent returned an empty response. Please try again.')
        }
      } else {
        setError(result?.error ?? 'Unknown error occurred')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    }
    setLoading(false)
    setActiveAgentId(null)
  }

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: HiHome },
    { id: 'history' as const, label: 'History', icon: HiClock },
    { id: 'settings' as const, label: 'Settings', icon: HiCog6Tooth },
  ]

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-60 flex flex-col border-r transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: 'hsl(231 18% 12%)', borderColor: 'hsl(232 16% 22%)' }}>
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'text-primary-foreground shadow-md' : 'hover:bg-[hsl(232,16%,20%)]'}`}
                  style={isActive ? { backgroundColor: 'hsl(265 89% 72%)', color: 'hsl(0 0% 100%)' } : { color: 'hsl(60 30% 96%)' }}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Sample Data Toggle */}
          <div className="p-4 border-t" style={{ borderColor: 'hsl(232 16% 22%)' }}>
            <div className="flex items-center justify-between">
              <Label htmlFor="sample-toggle" className="text-xs cursor-pointer" style={{ color: 'hsl(228 10% 62%)' }}>
                Sample Data
              </Label>
              <Switch
                id="sample-toggle"
                checked={sampleMode}
                onCheckedChange={setSampleMode}
              />
            </div>
          </div>

          {/* Agent Info */}
          <AgentInfoSection activeAgentId={activeAgentId} />
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Mobile Header */}
          <div className="lg:hidden sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border p-3 flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <HiBars3 className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <HiSparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">AI Tools Daily Digest</span>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="sample-toggle-mobile" className="text-[10px] text-muted-foreground">Sample</Label>
              <Switch id="sample-toggle-mobile" checked={sampleMode} onCheckedChange={setSampleMode} />
            </div>
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
                />
              )}
              {activeView === 'history' && <HistoryView sampleMode={sampleMode} />}
              {activeView === 'settings' && <SettingsView />}
            </div>
          </ScrollArea>
        </main>
      </div>
    </ErrorBoundary>
  )
}
