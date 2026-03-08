'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Copy,
  Check,
  Plus,
  Target,
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Home,
  Briefcase,
  ChevronRight,
  Loader2,
  Calendar,
  BarChart3,
  Star,
  Send
} from 'lucide-react'
import dynamic from 'next/dynamic'

const AddListingDialog = dynamic(() => import('@/app/dashboard/listings/add-dialog'), { ssr: false })

// ==========================================
// MALTA CITIES
// ==========================================
const maltaCities = [
  'Attard', 'Balzan', 'Bahar ic-Caghaq', 'Birgu', 'Birkirkara', 'Birzebbuga',
  'Bormla', 'Bugibba', 'Dingli', 'Fgura', 'Floriana', 'Gharghur', 'Ghaxaq',
  'Gudja', 'Gzira', 'Hamrun', 'Iklin', 'Isla', 'Kalkara', 'Kirkop', 'Lija',
  'Luqa', 'Marsa', 'Marsaskala', 'Marsaxlokk', 'Mdina', 'Mellieha', 'Mgarr',
  'Mosta', 'Mqabba', 'Msida', 'Mtarfa', 'Naxxar', 'Paola', 'Pembroke', 'Pieta',
  'Qawra', 'Qormi', 'Qrendi', 'Rabat', 'Safi', 'San Giljan', 'San Gwann',
  'San Pawl il-Bahar', 'Santa Lucija', 'Santa Venera', 'Siggiewi', 'Sliema',
  "St. Julian's", "St. Paul's Bay", 'Swatar', 'Swieqi', "Ta' Xbiex", 'Tarxien',
  'Valletta', 'Xemxija', 'Xghajra', 'Zabbar', 'Zebbug', 'Zejtun', 'Zurrieq'
]

// ==========================================
// TYPES
// ==========================================
interface SubTarget {
  key: string
  label: string
  target: number
  icon?: string
}

interface MessageTemplate {
  key: string
  label: string
  content: string
}

interface TaskDefinition {
  id: string
  title: string
  slug: string
  description: string
  guide_content: string
  category: 'daily' | 'project' | 'coming_soon'
  daily_target: number
  daily_target_label: string | null
  sub_targets: SubTarget[]
  message_templates: MessageTemplate[]
  is_active: boolean
  sort_order: number
}

interface DailyLog {
  id: string
  user_id: string
  task_definition_id: string
  log_date: string
  sub_target_key: string
  count: number
  notes: string | null
  details: Array<Record<string, unknown>>
}

interface ClientQuery {
  id: string
  client_name: string
  client_description: string
  budget: string
  location_preference: string
  bedrooms: string
  additional_notes: string | null
  assigned_to: string | null
  assigned_by: string | null
  status: string
  property_suggestions: Array<{
    ref_no: string
    city: string
    bedrooms: string
    price: string
    status: string
    added_by: string
    added_at: string
  }>
  min_suggestions: number
}

// ==========================================
// HELPER COMPONENTS
// ==========================================

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function EnglishDatePicker({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const parsed = value ? new Date(value + 'T00:00:00') : new Date()
  const [viewYear, setViewYear] = useState(parsed.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed.getMonth())

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  // Monday-based: 0=Mon ... 6=Sun
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const selectDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(dateStr)
    setOpen(false)
  }

  const displayDate = value
    ? `${MONTH_NAMES[parsed.getMonth()].slice(0, 3)} ${parsed.getDate()}, ${parsed.getFullYear()}`
    : 'Select date'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
      >
        <Calendar className="h-4 w-4 text-gray-500" />
        <span>{displayDate}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg p-3 z-50 w-[280px]">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronUp className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-gray-500 mb-1">
            {DAY_NAMES.map(d => <div key={d} className="py-1 font-medium">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-sm">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isSelected = dateStr === value
              const isToday = dateStr === todayStr
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`py-1.5 rounded-md transition-colors ${
                    isSelected
                      ? 'bg-purple-600 text-white font-bold'
                      : isToday
                        ? 'bg-purple-100 text-purple-700 font-semibold'
                        : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => { onChange(todayStr); setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setOpen(false) }}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProgressRing({ progress, size = 80, strokeWidth = 8 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference
  const color = progress >= 100 ? '#10b981' : progress >= 60 ? '#8b5cf6' : progress >= 30 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>
        {Math.round(progress)}%
      </span>
    </div>
  )
}

function CopyableMessage({ template, onCopied }: { template: MessageTemplate; onCopied?: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(template.content)
    setCopied(true)
    onCopied?.()
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gray-50 border rounded-lg p-4 mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{template.label}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-white p-3 rounded border max-h-48 overflow-y-auto">
        {template.content}
      </pre>
    </div>
  )
}

function LogDetailsViewer({ details, title, onViewAll }: {
  details: Array<Record<string, unknown>>
  title: string
  onViewAll: (details: Array<Record<string, unknown>>, title: string) => void
}) {
  if (!details || details.length === 0) return null
  const visible = details.slice(0, 5)
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-500">Log Details ({details.length})</span>
        {details.length > 5 && (
          <button onClick={() => onViewAll(details, title)} className="text-xs text-purple-600 hover:text-purple-800 underline">
            View all ({details.length})
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {visible.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-1.5 border gap-2">
            {d.listing_link ? (
              <a href={String(d.listing_link)} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline truncate max-w-[120px]">
                🔗 Link
              </a>
            ) : <span className="text-gray-400">—</span>}
            <span className="truncate max-w-[80px]">{String(d.owner_name || '—')}</span>
            <span>{String(d.city || '—')}</span>
            <span>{d.bedrooms ? `${d.bedrooms} bed` : '—'}</span>
            <span>{d.price ? `€${d.price}` : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LogProgressButton({
  taskId,
  subTargetKey,
  label,
  onLog,
  listingMode,
  onOpenAddListing,
  onDetailOnlyLog,
}: {
  taskId: string
  subTargetKey: string
  label: string
  onLog: (taskId: string, subTargetKey: string, detail?: Record<string, unknown>) => Promise<void>
  listingMode?: boolean
  onOpenAddListing?: (taskId: string, subKey: string) => void
  onDetailOnlyLog?: (taskId: string, subKey: string, detail: Record<string, unknown>) => Promise<void>
}) {
  const [logging, setLogging] = useState(false)
  const [showDetailForm, setShowDetailForm] = useState(false)
  const [detail, setDetail] = useState({ listing_link: '', owner_name: '', city: '', bedrooms: '', price: '' })

  const handleQuickLog = async () => {
    if (listingMode && onOpenAddListing) {
      onOpenAddListing(taskId, subTargetKey)
      return
    }
    setLogging(true)
    try {
      await onLog(taskId, subTargetKey)
    } finally {
      setLogging(false)
    }
  }

  const handleDetailLog = async () => {
    setLogging(true)
    try {
      if (listingMode && onDetailOnlyLog) {
        await onDetailOnlyLog(taskId, subTargetKey, detail)
      } else {
        await onLog(taskId, subTargetKey, detail)
      }
      setDetail({ listing_link: '', owner_name: '', city: '', bedrooms: '', price: '' })
      setShowDetailForm(false)
    } finally {
      setLogging(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={handleQuickLog}
          disabled={logging}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-green-100 hover:bg-green-200 text-green-700 transition-colors disabled:opacity-50"
        >
          {logging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          +1 {label}
        </button>
        <button
          onClick={() => setShowDetailForm(!showDetailForm)}
          className="text-xs text-gray-500 hover:text-purple-600 underline"
        >
          {showDetailForm ? 'Close' : listingMode ? 'Add log details' : 'Add with details'}
        </button>
      </div>
      {showDetailForm && (
        <div className="mt-3 p-3 bg-white rounded-lg border space-y-2">
          <input
            type="text" placeholder="Listing link (Facebook URL)"
            value={detail.listing_link} onChange={e => setDetail(d => ({ ...d, listing_link: e.target.value }))}
            className="w-full text-sm px-3 py-1.5 border rounded-md focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
          />
          <input
            type="text" placeholder="Owner full name"
            value={detail.owner_name} onChange={e => setDetail(d => ({ ...d, owner_name: e.target.value }))}
            className="w-full text-sm px-3 py-1.5 border rounded-md focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text" placeholder="City"
              value={detail.city} onChange={e => setDetail(d => ({ ...d, city: e.target.value }))}
              className="text-sm px-3 py-1.5 border rounded-md focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
            />
            <input
              type="text" placeholder="Bedrooms"
              value={detail.bedrooms} onChange={e => setDetail(d => ({ ...d, bedrooms: e.target.value }))}
              className="text-sm px-3 py-1.5 border rounded-md focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
            />
            <input
              type="text" placeholder="Price €"
              value={detail.price} onChange={e => setDetail(d => ({ ...d, price: e.target.value }))}
              className="text-sm px-3 py-1.5 border rounded-md focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
            />
          </div>
          <button
            onClick={handleDetailLog}
            disabled={logging}
            className="w-full text-sm py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {logging ? 'Saving...' : 'Log with Details'}
          </button>
        </div>
      )}
    </div>
  )
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function InternshipTasksPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [tasks, setTasks] = useState<TaskDefinition[]>([])
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([])
  const [clientQueries, setClientQueries] = useState<ClientQuery[]>([])
  const [expandedGuides, setExpandedGuides] = useState<Set<string>>(new Set())
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'daily' | 'clients' | 'overview'>('overview')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  
  // Teamleader: yeni görev ekleme modalı
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '', description: '', guide_content: '', category: 'daily',
    daily_target: 0, daily_target_label: '', sub_targets: [{ key: '', label: '', target: 0 }],
    message_templates: [{ key: '', label: '', content: '' }]
  })
  const [newClient, setNewClient] = useState({
    client_name: '', client_description: '', budget: '', location_preference: '', bedrooms: '', additional_notes: '', assigned_to: ''
  })
  
  // Intern listesi (teamleader için)
  const [internList, setInternList] = useState<Array<{ user_id: string; full_name: string }>>([])

  // Teamleader: selected intern filter
  const [selectedInternId, setSelectedInternId] = useState<string>('all')

  // Add suggestion form state
  const [showSuggestionForm, setShowSuggestionForm] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState({ ref_no: '', city: '', bedrooms: '', price: '' })

  // Reassign state: which query card is showing reassign dropdown
  const [reassignQueryId, setReassignQueryId] = useState<string | null>(null)
  const [reassignTargetId, setReassignTargetId] = useState<string>('')

  // Add Listing dialog states (for linking +1 buttons to real listing creation)
  const [listingDialogOpen, setListingDialogOpen] = useState(false)
  const [listingDialogSubTarget, setListingDialogSubTarget] = useState<{ taskId: string; subKey: string } | null>(null)

  // Details modal state (for "View all" popup when >5 details)
  const [detailsModal, setDetailsModal] = useState<{ details: Array<Record<string, unknown>>; title: string; page: number } | null>(null)

  const isTeamleader = ['teamleader', 'manager', 'boss', 'admin'].includes(userRole)

  // Helper: get intern name by id
  const getInternName = (id: string | null): string => {
    if (!id) return 'Unassigned'
    const intern = internList.find(i => i.user_id === id)
    return intern?.full_name || 'Unknown Intern'
  }

  // ==========================================
  // DATA FETCHING
  // ==========================================
  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/sign-in'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('user_id', user.id)
        .single()

      if (!profile) { router.push('/sign-in'); return }

      setUserRole(profile.role)
      setUserName(profile.full_name || user.email?.split('@')[0] || '')
      setUserId(user.id)

      // Fetch task definitions
      const tasksRes = await fetch('/api/internship-tasks')
      const tasksData = await tasksRes.json()
      setTasks(tasksData.tasks || [])

      // Fetch daily logs
      const logsRes = await fetch(`/api/internship-tasks/daily-logs?date=${selectedDate}`)
      const logsData = await logsRes.json()
      setDailyLogs(logsData.logs || [])

      // Fetch client queries
      const queriesRes = await fetch('/api/internship-tasks/client-queries?status=active')
      const queriesData = await queriesRes.json()
      setClientQueries(queriesData.queries || [])

      // Teamleader: fetch intern listesi
      if (['teamleader', 'manager', 'boss', 'admin'].includes(profile.role)) {
        const { data: interns } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('role', 'intern')
        setInternList(interns || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, router, selectedDate])

  useEffect(() => { fetchData() }, [fetchData])

  // ==========================================
  // LOG PROGRESS
  // ==========================================
  const handleLogProgress = async (taskId: string, subTargetKey: string, detail?: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/internship-tasks/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_definition_id: taskId,
          sub_target_key: subTargetKey,
          detail: detail || null,
        }),
      })
      if (res.ok) {
        // Refresh logs
        const logsRes = await fetch(`/api/internship-tasks/daily-logs?date=${selectedDate}`)
        const logsData = await logsRes.json()
        setDailyLogs(logsData.logs || [])
      }
    } catch (error) {
      console.error('Error logging progress:', error)
    }
  }

  // ==========================================
  // DETAIL-ONLY LOG (no count increment)
  // ==========================================
  const handleDetailOnlyLog = async (taskId: string, subTargetKey: string, detail: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/internship-tasks/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_definition_id: taskId,
          sub_target_key: subTargetKey,
          detail,
          detail_only: true,
        }),
      })
      if (res.ok) {
        const logsRes = await fetch(`/api/internship-tasks/daily-logs?date=${selectedDate}`)
        const logsData = await logsRes.json()
        setDailyLogs(logsData.logs || [])
      }
    } catch (error) {
      console.error('Error logging detail:', error)
    }
  }

  // ==========================================
  // LISTING CREATED → AUTO-LOG PROGRESS
  // ==========================================
  const handleListingCreated = async (listingId: string) => {
    if (listingDialogSubTarget) {
      await handleLogProgress(listingDialogSubTarget.taskId, listingDialogSubTarget.subKey)
    }
    // Don't close the dialog automatically - user may need to Upload/Post
  }

  // ==========================================
  // ADD PROPERTY SUGGESTION TO CLIENT QUERY
  // ==========================================
  const handleAddSuggestion = async (queryId: string) => {
    try {
      const res = await fetch('/api/internship-tasks/client-queries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query_id: queryId,
          action: 'add_suggestion',
          ...suggestion,
        }),
      })
      if (res.ok) {
        setSuggestion({ ref_no: '', city: '', bedrooms: '', price: '' })
        setShowSuggestionForm(null)
        // Refresh queries
        const queriesRes = await fetch('/api/internship-tasks/client-queries?status=active')
        const queriesData = await queriesRes.json()
        setClientQueries(queriesData.queries || [])
      }
    } catch (error) {
      console.error('Error adding suggestion:', error)
    }
  }

  // ==========================================
  // COMPLETE CLIENT QUERY (teamleader only)
  // ==========================================
  const handleCompleteQuery = async (queryId: string) => {
    try {
      const res = await fetch('/api/internship-tasks/client-queries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_id: queryId, action: 'complete' }),
      })
      if (res.ok) {
        const queriesRes = await fetch('/api/internship-tasks/client-queries?status=active')
        const queriesData = await queriesRes.json()
        setClientQueries(queriesData.queries || [])
      }
    } catch (error) {
      console.error('Error completing query:', error)
    }
  }

  // ==========================================
  // REASSIGN CLIENT QUERY (teamleader only)
  // ==========================================
  const handleReassignQuery = async (queryId: string, newInternId: string) => {
    if (!newInternId) return
    try {
      const res = await fetch('/api/internship-tasks/client-queries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_id: queryId, action: 'reassign', assigned_to: newInternId }),
      })
      if (res.ok) {
        const queriesRes = await fetch('/api/internship-tasks/client-queries?status=active')
        const queriesData = await queriesRes.json()
        setClientQueries(queriesData.queries || [])
        setReassignQueryId(null)
        setReassignTargetId('')
      }
    } catch (error) {
      console.error('Error reassigning query:', error)
    }
  }

  // ==========================================
  // CREATE NEW TASK (teamleader)
  // ==========================================
  const handleCreateTask = async () => {
    try {
      const payload = {
        ...newTask,
        sub_targets: newTask.sub_targets.filter(st => st.key && st.label),
        message_templates: newTask.message_templates.filter(mt => mt.key && mt.content),
      }
      const res = await fetch('/api/internship-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setShowNewTaskModal(false)
        setNewTask({
          title: '', description: '', guide_content: '', category: 'daily',
          daily_target: 0, daily_target_label: '', sub_targets: [{ key: '', label: '', target: 0 }],
          message_templates: [{ key: '', label: '', content: '' }]
        })
        fetchData()
      }
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  // ==========================================
  // CREATE NEW CLIENT QUERY (teamleader)
  // ==========================================
  const handleCreateClient = async () => {
    try {
      const res = await fetch('/api/internship-tasks/client-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      })
      if (res.ok) {
        setShowNewClientModal(false)
        setNewClient({ client_name: '', client_description: '', budget: '', location_preference: '', bedrooms: '', additional_notes: '', assigned_to: '' })
        fetchData()
      }
    } catch (error) {
      console.error('Error creating client query:', error)
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================
  // Filter logs by intern (for teamleader multi-intern view)
  const getFilteredLogs = (internId?: string): DailyLog[] => {
    if (internId) return dailyLogs.filter(l => l.user_id === internId)
    if (!isTeamleader) return dailyLogs
    if (selectedInternId === 'all') return dailyLogs
    return dailyLogs.filter(l => l.user_id === selectedInternId)
  }

  const getLogCount = (taskId: string, subKey: string, internId?: string): number => {
    const logs = getFilteredLogs(internId)
    const log = logs.find(l => l.task_definition_id === taskId && l.sub_target_key === subKey)
    return log?.count || 0
  }

  const getLogDetails = (taskId: string, subKey: string, internId?: string): Array<Record<string, unknown>> => {
    const logs = getFilteredLogs(internId)
    const log = logs.find(l => l.task_definition_id === taskId && l.sub_target_key === subKey)
    return log?.details || []
  }

  const getOverallProgress = (internId?: string): number => {
    const dTasks = tasks.filter(t => t.category === 'daily' && t.sub_targets.length > 0)
    if (dTasks.length === 0) return 0

    let totalTarget = 0
    let totalDone = 0

    dTasks.forEach(task => {
      task.sub_targets.forEach(st => {
        totalTarget += st.target
        totalDone += Math.min(getLogCount(task.id, st.key, internId), st.target)
      })
    })

    return totalTarget > 0 ? (totalDone / totalTarget) * 100 : 0
  }

  const toggleGuide = (taskId: string) => {
    setExpandedGuides(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const toggleTemplates = (taskId: string) => {
    setExpandedTemplates(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const getDashboardUrl = () => {
    if (userRole === 'intern') return '/intern'
    if (userRole === 'teamleader') return '/teamleader'
    if (userRole === 'manager') return '/manager'
    if (userRole === 'boss') return '/boss'
    return '/dashboard'
  }

  // ==========================================
  // LOADING
  // ==========================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDER
  // ==========================================
  const dailyTasks = tasks.filter(t => t.category === 'daily')
  const projectTasks = tasks.filter(t => t.category === 'project')
  const comingSoonTasks = tasks.filter(t => t.category === 'coming_soon')
  const effectiveInternId = isTeamleader && selectedInternId !== 'all' ? selectedInternId : (!isTeamleader ? undefined : undefined)
  const overallProgress = getOverallProgress(effectiveInternId)
  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 md:px-8 lg:px-16 py-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link href={getDashboardUrl()} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <ClipboardCheck className="h-7 w-7 text-purple-600" />
                Internship Tasks
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isTeamleader ? 'Manage intern tasks, track team progress' : `Welcome ${userName}! Track your daily progress`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Teamleader: Intern Filter */}
            {isTeamleader && internList.length > 0 && (
              <select
                value={selectedInternId}
                onChange={e => setSelectedInternId(e.target.value)}
                className="text-sm px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-purple-400"
              >
                <option value="all">All Interns</option>
                {internList.map(intern => (
                  <option key={intern.user_id} value={intern.user_id}>
                    {intern.full_name || 'Unnamed Intern'}
                  </option>
                ))}
              </select>
            )}

            {/* Date Picker */}
            <EnglishDatePicker value={selectedDate} onChange={setSelectedDate} />
            
            {/* Teamleader: Yeni görev & client ekleme */}
            {isTeamleader && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewTaskModal(true)}
                  className="flex items-center gap-1.5 text-sm px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" /> New Task
                </button>
                <button
                  onClick={() => setShowNewClientModal(true)}
                  className="flex items-center gap-1.5 text-sm px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  <Users className="h-4 w-4" /> New Client
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border mb-8 w-fit">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'daily', label: 'Daily Tasks', icon: Target },
            { key: 'clients', label: 'Client Queries', icon: Users },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ==========================================
            OVERVIEW TAB
        ========================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Teamleader: Per-Intern Progress Cards */}
            {isTeamleader && internList.length > 0 && selectedInternId === 'all' ? (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">
                  {isToday ? "Today's" : selectedDate} Team Progress
                </h2>
                {internList.map(intern => {
                  const internProgress = getOverallProgress(intern.user_id)
                  const internLogs = dailyLogs.filter(l => l.user_id === intern.user_id)
                  return (
                    <div key={intern.user_id} className="bg-white rounded-xl border shadow-sm p-6">
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        <ProgressRing progress={internProgress} size={100} strokeWidth={8} />
                        <div className="flex-1 text-center md:text-left">
                          <h3 className="text-lg font-bold flex items-center gap-2">
                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold">
                              {(intern.full_name || '?').charAt(0).toUpperCase()}
                            </span>
                            {intern.full_name || 'Unnamed Intern'}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {internProgress >= 100
                              ? '🎉 All daily targets completed!'
                              : internProgress >= 60
                              ? '💪 Great progress!'
                              : internProgress >= 30
                              ? '📈 In progress'
                              : internLogs.length === 0
                              ? '⏳ No activity yet today'
                              : '🚀 Just started'}
                          </p>
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {dailyTasks.map(task =>
                              task.sub_targets.map(st => {
                                const count = getLogCount(task.id, st.key, intern.user_id)
                                const pct = st.target > 0 ? Math.min((count / st.target) * 100, 100) : 0
                                return (
                                  <div key={`${task.id}-${st.key}`} className="bg-gray-50 rounded-lg p-3 border">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-gray-600">{st.icon} {st.label}</span>
                                      <span className="text-xs font-bold">{count}/{st.target}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-purple-500' : 'bg-amber-500'}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {internList.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-xl border">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No interns registered yet.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Single intern view (own view or teamleader filtered) */
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <ProgressRing progress={overallProgress} size={120} strokeWidth={10} />
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-xl font-bold">
                      {isToday ? "Today's" : selectedDate} Daily Progress
                      {isTeamleader && selectedInternId !== 'all' && (
                        <span className="text-purple-600 ml-2">— {getInternName(selectedInternId)}</span>
                      )}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      {overallProgress >= 100
                        ? '🎉 Outstanding! All daily targets completed!'
                        : overallProgress >= 60
                        ? '💪 Great progress! Keep going!'
                        : overallProgress >= 30
                        ? '📈 Good start! Stay focused!'
                        : '🚀 Let\'s get started!'}
                    </p>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {dailyTasks.map(task =>
                        task.sub_targets.map(st => {
                          const count = getLogCount(task.id, st.key, effectiveInternId)
                          const pct = st.target > 0 ? Math.min((count / st.target) * 100, 100) : 0
                          return (
                            <div key={`${task.id}-${st.key}`} className="bg-gray-50 rounded-lg p-3 border">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-600">{st.icon} {st.label}</span>
                                <span className="text-xs font-bold">{count}/{st.target}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-purple-500' : 'bg-amber-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Task Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasks.map(task => {
                const isComing = task.category === 'coming_soon'
                const totalTarget = task.sub_targets.reduce((sum, st) => sum + st.target, 0)
                const totalDone = task.sub_targets.reduce((sum, st) => sum + Math.min(getLogCount(task.id, st.key, effectiveInternId), st.target), 0)
                const progress = totalTarget > 0 ? (totalDone / totalTarget) * 100 : 0

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isComing ? 'opacity-60' : 'hover:shadow-md transition-shadow'}`}
                  >
                    <div className={`h-1.5 ${isComing ? 'bg-gray-300' : progress >= 100 ? 'bg-green-500' : 'bg-purple-500'}`} />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {task.category === 'daily' && <Target className="h-5 w-5 text-purple-600 flex-shrink-0" />}
                          {task.category === 'project' && <Briefcase className="h-5 w-5 text-indigo-600 flex-shrink-0" />}
                          {task.category === 'coming_soon' && <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                          <h3 className="font-semibold text-sm">{task.title}</h3>
                        </div>
                        {!isComing && totalTarget > 0 && (
                          <ProgressRing progress={progress} size={48} strokeWidth={5} />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{task.description}</p>
                      
                      {isComing ? (
                        <div className="text-center py-4">
                          <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-400 font-medium">Coming Soon</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (task.category === 'daily') setActiveTab('daily')
                            else setActiveTab('clients')
                          }}
                          className="w-full text-sm py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors font-medium"
                        >
                          {task.category === 'daily' ? 'Task Progress' : 'View Details'}
                          <ChevronRight className="inline h-4 w-4 ml-1" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            DAILY TASKS TAB
        ========================================== */}
        {activeTab === 'daily' && (
          <div className="space-y-6">
            {dailyTasks.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border">
                <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No daily tasks defined yet.</p>
              </div>
            ) : (
              dailyTasks.map(task => (
                <div key={task.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  {/* Task Header */}
                  <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                          <Target className="h-5 w-5 text-purple-600" />
                          {task.title}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* Sub-target progress badges */}
                        {task.sub_targets.map(st => {
                          const count = isTeamleader && selectedInternId !== 'all'
                            ? getLogCount(task.id, st.key, selectedInternId)
                            : isTeamleader
                            ? 0 // Don't show aggregate for all interns
                            : getLogCount(task.id, st.key)
                          const done = count >= st.target
                          return (
                            <div
                              key={st.key}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${
                                done ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-700'
                              }`}
                            >
                              <span>{st.icon}</span>
                              <span>{count}/{st.target}</span>
                              {done && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Teamleader: Per-intern daily breakdown */}
                    {isTeamleader && selectedInternId === 'all' && internList.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4 text-purple-600" />
                          Intern Progress
                        </h3>
                        <div className="space-y-3">
                          {internList.map(intern => (
                            <div key={intern.user_id} className="bg-gray-50 rounded-lg p-4 border">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                                  {(intern.full_name || '?').charAt(0).toUpperCase()}
                                </span>
                                <span className="text-sm font-semibold">{intern.full_name || 'Unnamed'}</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {task.sub_targets.map(st => {
                                  const count = getLogCount(task.id, st.key, intern.user_id)
                                  const pct = st.target > 0 ? Math.min((count / st.target) * 100, 100) : 0
                                  const stDetails = getLogDetails(task.id, st.key, intern.user_id)
                                  return (
                                    <div key={st.key}>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-gray-600">{st.icon} {st.label}</span>
                                        <span className={`text-xs font-bold ${count >= st.target ? 'text-green-600' : 'text-gray-600'}`}>{count}/{st.target}</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-purple-500'}`} style={{ width: `${pct}%` }} />
                                      </div>
                                      <LogDetailsViewer
                                        details={stDetails}
                                        title={`${intern.full_name} — ${st.label}`}
                                        onViewAll={(dets, t) => setDetailsModal({ details: dets, title: t, page: 0 })}
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Teamleader: Single intern selected — read-only view */}
                    {isTeamleader && selectedInternId !== 'all' && (
                      <div>
                        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                          {getInternName(selectedInternId)}&apos;s Progress
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {task.sub_targets.map(st => {
                            const count = getLogCount(task.id, st.key, selectedInternId)
                            const stDetails = getLogDetails(task.id, st.key, selectedInternId)
                            return (
                              <div key={st.key} className="bg-gray-50 rounded-lg p-4 border">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-medium">{st.icon} {st.label}</span>
                                  <span className={`text-sm font-bold ${count >= st.target ? 'text-green-600' : 'text-gray-700'}`}>{count}/{st.target}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div className={`h-2 rounded-full transition-all ${count >= st.target ? 'bg-green-500' : 'bg-purple-500'}`} style={{ width: `${Math.min((count / st.target) * 100, 100)}%` }} />
                                </div>
                                <LogDetailsViewer
                                  details={stDetails}
                                  title={`${getInternName(selectedInternId)} — ${st.label}`}
                                  onViewAll={(dets, t) => setDetailsModal({ details: dets, title: t, page: 0 })}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Intern: Progress Logging */}
                    {isToday && !isTeamleader && (
                      <div>
                        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                          Log Your Progress
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {task.sub_targets.map(st => (
                            <div key={st.key} className="bg-gray-50 rounded-lg p-4 border">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium">{st.icon} {st.label}</span>
                                <span className={`text-sm font-bold ${getLogCount(task.id, st.key) >= st.target ? 'text-green-600' : 'text-gray-700'}`}>
                                  {getLogCount(task.id, st.key)}/{st.target}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    getLogCount(task.id, st.key) >= st.target ? 'bg-green-500' : 'bg-purple-500'
                                  }`}
                                  style={{ width: `${Math.min((getLogCount(task.id, st.key) / st.target) * 100, 100)}%` }}
                                />
                              </div>
                              <LogProgressButton
                                taskId={task.id}
                                subTargetKey={st.key}
                                label={st.label}
                                onLog={handleLogProgress}
                                listingMode={st.key === 'new_listings' || st.key === 'teamwork_listings'}
                                onOpenAddListing={(tId, sKey) => {
                                  setListingDialogSubTarget({ taskId: tId, subKey: sKey })
                                  setListingDialogOpen(true)
                                }}
                                onDetailOnlyLog={handleDetailOnlyLog}
                              />
                              <LogDetailsViewer
                                details={getLogDetails(task.id, st.key)}
                                title={`${st.label}`}
                                onViewAll={(dets, t) => setDetailsModal({ details: dets, title: t, page: 0 })}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message Templates */}
                    {task.message_templates.length > 0 && (
                      <div>
                        <button
                          onClick={() => toggleTemplates(task.id)}
                          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-purple-600 transition-colors"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message Templates ({task.message_templates.length})
                          {expandedTemplates.has(task.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {expandedTemplates.has(task.id) && (
                          <div className="mt-3 space-y-3">
                            {task.message_templates.map((template, idx) => (
                              <CopyableMessage key={idx} template={template} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Guide */}
                    <div>
                      <button
                        onClick={() => toggleGuide(task.id)}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-purple-600 transition-colors"
                      >
                        <Search className="h-4 w-4" />
                        How to do this task — Step by Step Guide
                        {expandedGuides.has(task.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {expandedGuides.has(task.id) && (
                        <div className="mt-3 bg-gradient-to-br from-gray-50 to-white border rounded-lg p-5 prose prose-sm max-w-none">
                          <div
                            className="markdown-content"
                            dangerouslySetInnerHTML={{
                              __html: task.guide_content
                                .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-gray-800 mt-4 mb-2">$1</h3>')
                                .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-purple-700 mt-5 mb-3">$1</h2>')
                                .replace(/^#### (.*$)/gim, '<h4 class="text-sm font-bold text-gray-700 mt-3 mb-1">$1</h4>')
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/^- (✅|🚫|⚠️) (.*$)/gim, '<div class="flex items-start gap-2 ml-4 my-1"><span>$1</span><span>$2</span></div>')
                                .replace(/^- (.*$)/gim, '<li class="ml-4 my-0.5 text-gray-600">$1</li>')
                                .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 my-1 list-decimal text-gray-700 font-medium">$1</li>')
                                .replace(/\n\n/g, '<br/>')
                                .replace(/\| (.*?) \|/g, (match: string) => {
                                  const cells = match.split('|').filter(Boolean).map(c => c.trim())
                                  return `<div class="grid grid-cols-3 gap-2 text-xs py-1">${cells.map(c => `<span class="bg-gray-100 px-2 py-1 rounded">${c}</span>`).join('')}</div>`
                                })
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Coming Soon Tasks */}
            {comingSoonTasks.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-500 mb-4">Coming Soon</h3>
                {comingSoonTasks.map(task => (
                  <div key={task.id} className="bg-white rounded-xl border shadow-sm p-6 opacity-60">
                    <div className="flex items-center gap-3">
                      <Clock className="h-6 w-6 text-gray-400" />
                      <div>
                        <h3 className="font-semibold">{task.title}</h3>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            CLIENT RESEARCH TAB
        ========================================== */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            {/* Project task description */}
            {projectTasks.map(task => (
              <div key={task.id} className="bg-white rounded-xl border shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-indigo-600" />
                      {task.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  </div>
                </div>

                {/* Message Template */}
                {task.message_templates.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => toggleTemplates(task.id)}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Message Templates
                      {expandedTemplates.has(task.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expandedTemplates.has(task.id) && (
                      <div className="mt-2">
                        {task.message_templates.map((t, i) => (
                          <CopyableMessage key={i} template={t} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Guide */}
                <button
                  onClick={() => toggleGuide(task.id)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-colors"
                >
                  <Search className="h-4 w-4" />
                  Step by Step Guide
                  {expandedGuides.has(task.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedGuides.has(task.id) && (
                  <div className="mt-3 bg-gradient-to-br from-gray-50 to-white border rounded-lg p-5 prose prose-sm max-w-none">
                    <div
                      className="markdown-content"
                      dangerouslySetInnerHTML={{
                        __html: task.guide_content
                          .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-gray-800 mt-4 mb-2">$1</h3>')
                          .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-indigo-700 mt-5 mb-3">$1</h2>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/^- (.*$)/gim, '<li class="ml-4 my-0.5 text-gray-600">$1</li>')
                          .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 my-1 list-decimal text-gray-700 font-medium">$1</li>')
                          .replace(/\n\n/g, '<br/>')
                      }}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Client Query Cards */}
            <h3 className="text-lg font-bold flex items-center gap-2 mt-8">
              <Users className="h-5 w-5 text-indigo-600" />
              Active Client Queries
              <span className="text-sm font-normal text-muted-foreground">({clientQueries.length})</span>
            </h3>

            {clientQueries.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No active client queries.</p>
                {isTeamleader && (
                  <button
                    onClick={() => setShowNewClientModal(true)}
                    className="mt-4 text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                  >
                    <Plus className="h-4 w-4 inline mr-1" />
                    Add First Client Query
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {clientQueries.map(query => (
                  <div key={query.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 border-b">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-base">{query.client_name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{query.client_description}</p>
                          {isTeamleader && (
                            <p className="text-xs mt-1.5 font-medium text-purple-600">
                              👤 Assigned to: {getInternName(query.assigned_to)}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          query.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {query.status === 'completed' ? 'Completed' : 'Active'}
                        </span>
                      </div>
                      
                      <div className="mt-3 flex flex-wrap gap-2">
                        {query.budget && (
                          <span className="text-xs bg-white px-2.5 py-1 rounded-full border">
                            💰 {query.budget}
                          </span>
                        )}
                        {query.location_preference && (
                          <span className="text-xs bg-white px-2.5 py-1 rounded-full border">
                            📍 {query.location_preference}
                          </span>
                        )}
                        {query.bedrooms && (
                          <span className="text-xs bg-white px-2.5 py-1 rounded-full border">
                            🛏️ {query.bedrooms} bed
                          </span>
                        )}
                      </div>
                      {query.additional_notes && (
                        <p className="text-xs text-gray-500 mt-2 italic">{query.additional_notes}</p>
                      )}
                    </div>

                    <div className="p-5">
                      {/* Property Suggestions */}
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold flex items-center gap-1.5">
                          <Home className="h-4 w-4 text-indigo-600" />
                          Property Suggestions
                          <span className="text-xs font-normal text-gray-500">
                            ({(query.property_suggestions || []).length}/{query.min_suggestions} min)
                          </span>
                        </h4>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              (query.property_suggestions || []).length >= query.min_suggestions ? 'bg-green-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${Math.min(((query.property_suggestions || []).length / query.min_suggestions) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Existing suggestions */}
                      {(query.property_suggestions || []).length > 0 && (
                        <div className="space-y-2 mb-4">
                          {(query.property_suggestions || []).map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2 border">
                              <span className="font-mono font-medium text-indigo-700">Ref: {s.ref_no}</span>
                              <span>{s.city}</span>
                              <span>{s.bedrooms} bed</span>
                              <span>€{s.price}</span>
                              <span className={`px-1.5 py-0.5 rounded ${s.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                {s.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add suggestion form */}
                      {!isTeamleader && query.status === 'active' && (
                        <div>
                          {showSuggestionForm === query.id ? (
                            <div className="space-y-2 bg-gray-50 rounded-lg p-3 border">
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text" placeholder="Ref Number"
                                  value={suggestion.ref_no} onChange={e => setSuggestion(s => ({ ...s, ref_no: e.target.value }))}
                                  className="text-sm px-3 py-1.5 border rounded-md focus:ring-2 focus:ring-indigo-400"
                                />
                                <select
                                  value={suggestion.city} onChange={e => setSuggestion(s => ({ ...s, city: e.target.value }))}
                                  className="text-sm px-3 py-1.5 border rounded-md focus:ring-2 focus:ring-indigo-400 bg-white"
                                >
                                  <option value="">Select City</option>
                                  {maltaCities.map(city => (
                                    <option key={city} value={city}>{city}</option>
                                  ))}
                                </select>
                                <input
                                  type="text" placeholder="Bedrooms"
                                  value={suggestion.bedrooms} onChange={e => setSuggestion(s => ({ ...s, bedrooms: e.target.value }))}
                                  className="text-sm px-3 py-1.5 border rounded-md focus:ring-2 focus:ring-indigo-400"
                                />
                                <input
                                  type="text" placeholder="Price €"
                                  value={suggestion.price} onChange={e => setSuggestion(s => ({ ...s, price: e.target.value }))}
                                  className="text-sm px-3 py-1.5 border rounded-md focus:ring-2 focus:ring-indigo-400"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAddSuggestion(query.id)}
                                  className="flex-1 text-sm py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
                                >
                                  <Send className="h-3.5 w-3.5 inline mr-1" />
                                  Add Suggestion
                                </button>
                                <button
                                  onClick={() => { setShowSuggestionForm(null); setSuggestion({ ref_no: '', city: '', bedrooms: '', price: '' }) }}
                                  className="text-sm px-3 py-1.5 border rounded-md hover:bg-gray-100"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowSuggestionForm(query.id)}
                              className="w-full text-sm py-2 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                            >
                              <Plus className="h-4 w-4 inline mr-1" />
                              Add Property Suggestion
                            </button>
                          )}
                        </div>
                      )}

                      {/* Teamleader: Reassign + Complete buttons */}
                      {isTeamleader && query.status === 'active' && (
                        <div className="mt-3 space-y-2">
                          {/* Reassign section */}
                          {reassignQueryId === query.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={reassignTargetId}
                                onChange={e => setReassignTargetId(e.target.value)}
                                className="flex-1 text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400 bg-white"
                              >
                                <option value="">— Select intern —</option>
                                {internList.map(intern => (
                                  <option key={intern.user_id} value={intern.user_id}>
                                    {intern.full_name || 'Unnamed'}
                                    {intern.user_id === query.assigned_to ? ' (current)' : ''}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleReassignQuery(query.id, reassignTargetId)}
                                disabled={!reassignTargetId || reassignTargetId === query.assigned_to}
                                className="text-sm px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setReassignQueryId(null); setReassignTargetId('') }}
                                className="text-sm px-3 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setReassignQueryId(query.id); setReassignTargetId(query.assigned_to || '') }}
                                className="flex-1 text-sm py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors font-medium"
                              >
                                <Users className="h-4 w-4 inline mr-1" />
                                Reassign
                              </button>
                              <button
                                onClick={() => handleCompleteQuery(query.id)}
                                className="flex-1 text-sm py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                              >
                                <CheckCircle2 className="h-4 w-4 inline mr-1" />
                                Mark as Completed
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            NEW TASK MODAL (Teamleader)
        ========================================== */}
        {showNewTaskModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-5 flex items-center justify-between">
                <h2 className="text-lg font-bold">Create New Task</h2>
                <button onClick={() => setShowNewTaskModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Task Title *</label>
                  <input
                    type="text" value={newTask.title}
                    onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
                    placeholder="e.g., Instagram Outreach"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
                    rows={2} placeholder="Brief description of the task"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={newTask.category}
                    onChange={e => setNewTask(t => ({ ...t, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="daily">Daily Task</option>
                    <option value="project">Project Task</option>
                    <option value="coming_soon">Coming Soon</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Guide Content (Markdown)</label>
                  <textarea
                    value={newTask.guide_content}
                    onChange={e => setNewTask(t => ({ ...t, guide_content: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400 font-mono text-sm"
                    rows={8} placeholder="## How to complete this task..."
                  />
                </div>

                {/* Sub-targets */}
                <div>
                  <label className="block text-sm font-medium mb-2">Daily Sub-Targets</label>
                  {newTask.sub_targets.map((st, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                      <input
                        type="text" value={st.key} placeholder="Key (e.g., new_listings)"
                        onChange={e => {
                          const updated = [...newTask.sub_targets]
                          updated[i].key = e.target.value
                          setNewTask(t => ({ ...t, sub_targets: updated }))
                        }}
                        className="text-sm px-3 py-1.5 border rounded-md"
                      />
                      <input
                        type="text" value={st.label} placeholder="Label"
                        onChange={e => {
                          const updated = [...newTask.sub_targets]
                          updated[i].label = e.target.value
                          setNewTask(t => ({ ...t, sub_targets: updated }))
                        }}
                        className="text-sm px-3 py-1.5 border rounded-md"
                      />
                      <input
                        type="number" value={st.target} placeholder="Target"
                        onChange={e => {
                          const updated = [...newTask.sub_targets]
                          updated[i].target = parseInt(e.target.value) || 0
                          setNewTask(t => ({ ...t, sub_targets: updated }))
                        }}
                        className="text-sm px-3 py-1.5 border rounded-md"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => setNewTask(t => ({ ...t, sub_targets: [...t.sub_targets, { key: '', label: '', target: 0 }] }))}
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    + Add Sub-Target
                  </button>
                </div>

                {/* Message Templates */}
                <div>
                  <label className="block text-sm font-medium mb-2">Message Templates</label>
                  {newTask.message_templates.map((mt, i) => (
                    <div key={i} className="space-y-2 mb-3 p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text" value={mt.key} placeholder="Key"
                          onChange={e => {
                            const updated = [...newTask.message_templates]
                            updated[i].key = e.target.value
                            setNewTask(t => ({ ...t, message_templates: updated }))
                          }}
                          className="text-sm px-3 py-1.5 border rounded-md"
                        />
                        <input
                          type="text" value={mt.label} placeholder="Label"
                          onChange={e => {
                            const updated = [...newTask.message_templates]
                            updated[i].label = e.target.value
                            setNewTask(t => ({ ...t, message_templates: updated }))
                          }}
                          className="text-sm px-3 py-1.5 border rounded-md"
                        />
                      </div>
                      <textarea
                        value={mt.content} placeholder="Message content..."
                        onChange={e => {
                          const updated = [...newTask.message_templates]
                          updated[i].content = e.target.value
                          setNewTask(t => ({ ...t, message_templates: updated }))
                        }}
                        className="w-full text-sm px-3 py-1.5 border rounded-md"
                        rows={3}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => setNewTask(t => ({ ...t, message_templates: [...t.message_templates, { key: '', label: '', content: '' }] }))}
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    + Add Template
                  </button>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={handleCreateTask}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
                  >
                    Create Task
                  </button>
                  <button
                    onClick={() => setShowNewTaskModal(false)}
                    className="px-6 py-2.5 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            NEW CLIENT QUERY MODAL (Teamleader)
        ========================================== */}
        {showNewClientModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-5 flex items-center justify-between">
                <h2 className="text-lg font-bold">Add Client Query</h2>
                <button onClick={() => setShowNewClientModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Client Name *</label>
                  <input
                    type="text" value={newClient.client_name}
                    onChange={e => setNewClient(c => ({ ...c, client_name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g., Turkish Gentleman"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Client Description *</label>
                  <textarea
                    value={newClient.client_description}
                    onChange={e => setNewClient(c => ({ ...c, client_description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400"
                    rows={3} placeholder="Client details, profession, preferences..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Budget</label>
                    <input
                      type="text" value={newClient.budget}
                      onChange={e => setNewClient(c => ({ ...c, budget: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., Up to 1300€"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Bedrooms</label>
                    <input
                      type="text" value={newClient.bedrooms}
                      onChange={e => setNewClient(c => ({ ...c, bedrooms: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., 3"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location Preference</label>
                  <input
                    type="text" value={newClient.location_preference}
                    onChange={e => setNewClient(c => ({ ...c, location_preference: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., St Julians, Sliema"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Additional Notes</label>
                  <textarea
                    value={newClient.additional_notes}
                    onChange={e => setNewClient(c => ({ ...c, additional_notes: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2} placeholder="Any other important details..."
                  />
                </div>
                {internList.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Assign to Intern</label>
                    <select
                      value={newClient.assigned_to}
                      onChange={e => setNewClient(c => ({ ...c, assigned_to: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">— Select an intern —</option>
                      {internList.map(intern => (
                        <option key={intern.user_id} value={intern.user_id}>
                          {intern.full_name || intern.user_id}
                        </option>
                      ))}
                    </select>
                    {!newClient.assigned_to && (
                      <p className="text-xs text-amber-600 mt-1">⚠️ Please assign this query to an intern</p>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={handleCreateClient}
                    disabled={!newClient.client_name || !newClient.client_description || !newClient.assigned_to}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Client Query
                  </button>
                  <button
                    onClick={() => setShowNewClientModal(false)}
                    className="px-6 py-2.5 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Listing Dialog (opened from Daily Tasks +1 buttons) */}
        {!isTeamleader && (
          <AddListingDialog
            externalOpen={listingDialogOpen}
            onOpenChange={(isOpen) => {
              setListingDialogOpen(isOpen)
              if (!isOpen) setListingDialogSubTarget(null)
            }}
            onListingCreated={handleListingCreated}
            showTrigger={false}
          />
        )}

        {/* Details Modal — full table with pagination */}
        {detailsModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailsModal(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-sm">{detailsModal.title} — All Details ({detailsModal.details.length})</h3>
                <button onClick={() => setDetailsModal(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-auto max-h-[60vh] p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="pb-2 text-left">#</th>
                      <th className="pb-2 text-left">Link</th>
                      <th className="pb-2 text-left">Owner</th>
                      <th className="pb-2 text-left">City</th>
                      <th className="pb-2 text-left">Beds</th>
                      <th className="pb-2 text-left">Price</th>
                      <th className="pb-2 text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsModal.details.slice(detailsModal.page * 10, (detailsModal.page + 1) * 10).map((d, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 text-gray-400">{detailsModal.page * 10 + i + 1}</td>
                        <td className="py-2">
                          {d.listing_link
                            ? <a href={String(d.listing_link)} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">🔗 Link</a>
                            : '—'}
                        </td>
                        <td className="py-2">{String(d.owner_name || '—')}</td>
                        <td className="py-2">{String(d.city || '—')}</td>
                        <td className="py-2">{d.bedrooms ? `${d.bedrooms} bed` : '—'}</td>
                        <td className="py-2">{d.price ? `€${d.price}` : '—'}</td>
                        <td className="py-2 text-xs text-gray-400">{d.timestamp ? new Date(String(d.timestamp)).toLocaleTimeString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {detailsModal.details.length > 10 && (
                <div className="flex items-center justify-between p-4 border-t text-sm">
                  <span className="text-gray-500">
                    Page {detailsModal.page + 1} of {Math.ceil(detailsModal.details.length / 10)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDetailsModal(prev => prev ? { ...prev, page: 0 } : null)}
                      disabled={detailsModal.page === 0}
                      className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40 text-xs"
                    >First</button>
                    <button
                      onClick={() => setDetailsModal(prev => prev ? { ...prev, page: prev.page - 1 } : null)}
                      disabled={detailsModal.page === 0}
                      className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40 text-xs"
                    >Prev</button>
                    <button
                      onClick={() => setDetailsModal(prev => prev ? { ...prev, page: prev.page + 1 } : null)}
                      disabled={detailsModal.page >= Math.ceil(detailsModal.details.length / 10) - 1}
                      className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40 text-xs"
                    >Next</button>
                    <button
                      onClick={() => setDetailsModal(prev => prev ? { ...prev, page: Math.ceil(prev.details.length / 10) - 1 } : null)}
                      disabled={detailsModal.page >= Math.ceil(detailsModal.details.length / 10) - 1}
                      className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40 text-xs"
                    >Last</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
