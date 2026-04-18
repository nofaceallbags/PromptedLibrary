import { useState } from 'react'
import { Layers, Star, Plus, Check, Zap } from 'lucide-react'
import { Prompt } from '../types'
import { getCategoryColor } from '../utils/colors'

interface SidebarProps {
  categories: string[]
  prompts: Prompt[]
  filter: string
  onFilterChange: (f: string) => void
  onAddCategory: (name: string) => void
}

export default function Sidebar({ categories, prompts, filter, onFilterChange, onAddCategory }: SidebarProps) {
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  const starredCount = prompts.filter(p => p.starred).length

  const handleAddCat = () => {
    const name = newCatName.trim()
    if (name) {
      onAddCategory(name)
      setNewCatName('')
      setShowAddCat(false)
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon"><Zap size={20} fill="currentColor" /></div>
        <h1><span className="logo-red">PROMPTED</span><br /><span className="logo-white">LIBRARY</span></h1>
        <p className="logo-tagline">Your AI Prompt Vault!</p>
      </div>

      <div className="sidebar-divider" />

      <nav className="sidebar-nav">
        <p className="nav-section-label">BROWSE</p>
        <button
          className={`nav-item ${filter === 'all' ? 'nav-item--active' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          <span className="nav-item-left">
            <Layers size={15} />
            All Prompts
          </span>
          <span className="nav-badge">{prompts.length}</span>
        </button>

        <button
          className={`nav-item ${filter === 'starred' ? 'nav-item--active nav-item--starred' : ''}`}
          onClick={() => onFilterChange('starred')}
        >
          <span className="nav-item-left">
            <Star size={15} fill={filter === 'starred' ? 'currentColor' : 'none'} />
            Favorites
          </span>
          <span className="nav-badge">{starredCount}</span>
        </button>
      </nav>

      <div className="sidebar-divider" />

      <div className="sidebar-categories">
        <div className="cat-header">
          <p className="nav-section-label">CATEGORIES</p>
          <button
            className="cat-add-btn"
            onClick={() => setShowAddCat(v => !v)}
            title="Add category"
          >
            <Plus size={13} />
          </button>
        </div>

        {showAddCat && (
          <div className="cat-add-form">
            <input
              className="cat-add-input"
              placeholder="New folder name..."
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCat()}
              autoFocus
            />
            <button className="cat-add-save" onClick={handleAddCat} title="Save">
              <Check size={12} />
            </button>
          </div>
        )}

        {categories.map(cat => {
          const color = getCategoryColor(cat)
          const count = prompts.filter(p => p.category === cat).length
          const isActive = filter === cat
          return (
            <button
              key={cat}
              className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
              onClick={() => onFilterChange(cat)}
              style={isActive ? {
                background: color.bg,
                color: color.text,
                borderColor: `${color.dot}40`,
              } : {}}
            >
              <span className="nav-item-left">
                <span className="cat-dot" style={{ background: color.dot }} />
                {cat}
              </span>
              <span className="nav-badge">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="sidebar-footer">
        <p className="sidebar-footer-text">
          You have {prompts.length} prompt{prompts.length !== 1 ? 's' : ''}!
        </p>
      </div>
    </aside>
  )
}
