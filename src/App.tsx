import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { Prompt } from './types'
import Sidebar from './components/Sidebar'
import PromptCard from './components/PromptCard'
import AddPromptModal from './components/AddPromptModal'

const STORAGE_KEY = 'prompted-library'
const DEFAULT_CATEGORIES = ['Personality', 'Voice & Tone', 'Backstory', 'Appearance', 'UGC Scripts', 'Social Captions', 'Replies & DMs']
const LEGACY_CATEGORIES = ['AI Avatars', 'Social Media', 'Business', 'Creative Writing', 'General']

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function loadCategories(): string[] {
  const saved = load(`${STORAGE_KEY}-categories`, DEFAULT_CATEGORIES)
  // Migrate: if saved categories are exactly the old defaults, replace with new ones
  if (JSON.stringify(saved) === JSON.stringify(LEGACY_CATEGORIES)) return DEFAULT_CATEGORIES
  return saved
}

export default function App() {
  const [prompts, setPrompts] = useState<Prompt[]>(() =>
    load(`${STORAGE_KEY}-prompts`, [])
  )
  const [categories, setCategories] = useState<string[]>(loadCategories)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-prompts`, JSON.stringify(prompts))
  }, [prompts])

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-categories`, JSON.stringify(categories))
  }, [categories])

  const addPrompt = (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    setPrompts(prev => [{ ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now }, ...prev])
  }

  const saveMultiple = (items: Array<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const now = new Date().toISOString()
    const newPrompts = items.map(data => ({ ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now }))
    setPrompts(prev => [...newPrompts, ...prev])
    setShowModal(false)
    setEditingPrompt(null)
  }

  const updatePrompt = (id: string, data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>) => {
    setPrompts(prev =>
      prev.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)
    )
  }

  const deletePrompt = (id: string) => {
    if (confirm('Are you sure? This prompt will be gone forever!')) {
      setPrompts(prev => prev.filter(p => p.id !== id))
    }
  }

  const toggleStar = (id: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, starred: !p.starred } : p))
  }

  const addCategory = (name: string) => {
    if (!categories.includes(name)) setCategories(prev => [...prev, name])
  }

  const openAdd = () => { setEditingPrompt(null); setShowModal(true) }
  const openEdit = (p: Prompt) => { setEditingPrompt(p); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditingPrompt(null) }

  const handleSave = (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingPrompt) {
      updatePrompt(editingPrompt.id, data)
    } else {
      addPrompt(data)
    }
    closeModal()
  }

  const filtered = prompts
    .filter(p => {
      if (filter === 'starred') return p.starred
      if (filter !== 'all') return p.category === filter
      return true
    })
    .filter(p => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    })

  const filterLabel =
    filter === 'all' ? 'All Prompts' :
    filter === 'starred' ? 'My Favorites' :
    filter

  const isEmpty = filtered.length === 0

  return (
    <div className="app-shell">
      <Sidebar
        categories={categories}
        prompts={prompts}
        filter={filter}
        onFilterChange={setFilter}
        onAddCategory={addCategory}
      />

      <main className="main">
        {/* Top Bar */}
        <header className="topbar">
          <div className="search-wrap">
            <Search size={16} className="search-icon-el" />
            <input
              className="search-input"
              placeholder="Find a prompt..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear">✕</button>
            )}
          </div>
          <button className="add-btn" onClick={openAdd}>
            <Plus size={17} />
            Add Prompt
          </button>
        </header>

        {/* Content */}
        <div className="content-area">
          <div className="content-header">
            <h2 className="content-title">{filterLabel}</h2>
            <span className="content-count">
              {filtered.length} prompt{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {isEmpty ? (
            <div className="empty-state">
              <div className="empty-icon">
                {search ? '🔍' : filter === 'starred' ? '⭐' : '📝'}
              </div>
              <h3 className="empty-title">
                {search
                  ? 'Nothing found!'
                  : filter === 'starred'
                  ? 'No favorites yet!'
                  : 'Nothing here yet!'}
              </h3>
              <p className="empty-sub">
                {search
                  ? `We couldn't find "${search}". Try different words!`
                  : filter === 'starred'
                  ? 'Click the ⭐ star on any prompt to save it here!'
                  : 'Add your first prompt! Type it, paste it, or drop in a PDF file!'}
              </p>
              {!search && filter === 'all' && (
                <button className="btn-primary empty-cta" onClick={openAdd}>
                  + Add Your First Prompt
                </button>
              )}
            </div>
          ) : (
            <div className="prompt-grid">
              {filtered.map(p => (
                <PromptCard
                  key={p.id}
                  prompt={p}
                  onToggleStar={toggleStar}
                  onDelete={deletePrompt}
                  onEdit={openEdit}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <AddPromptModal
          categories={categories}
          editingPrompt={editingPrompt}
          onSave={handleSave}
          onSaveMultiple={saveMultiple}
          onClose={closeModal}
          onAddCategory={addCategory}
        />
      )}
    </div>
  )
}
