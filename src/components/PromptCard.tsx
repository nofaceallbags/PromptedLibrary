import { useState } from 'react'
import { Star, Trash2, Copy, Check } from 'lucide-react'
import { Prompt } from '../types'
import { getCategoryColor } from '../utils/colors'

interface PromptCardProps {
  prompt: Prompt
  onToggleStar: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (prompt: Prompt) => void
}

export default function PromptCard({ prompt, onToggleStar, onDelete, onEdit }: PromptCardProps) {
  const [copied, setCopied] = useState(false)
  const color = getCategoryColor(prompt.category)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(prompt.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <article className="prompt-card" onClick={() => onEdit(prompt)} tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onEdit(prompt)}>
      <div className="card-top-row">
        <span className="cat-badge" style={{ background: color.bg, color: color.text }}>
          {prompt.category}
        </span>
        <button
          className={`star-btn ${prompt.starred ? 'star-btn--on' : ''}`}
          onClick={e => { e.stopPropagation(); onToggleStar(prompt.id) }}
          title={prompt.starred ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star size={18} fill={prompt.starred ? 'currentColor' : 'none'} />
        </button>
      </div>

      <h3 className="card-title">{prompt.title}</h3>

      <p className="card-preview">{prompt.content}</p>

      <div className="card-footer">
        <div className="card-meta">
          <span className="card-date">{formatDate(prompt.updatedAt)}</span>
          <span className="card-chars">{prompt.content.length} letters</span>
        </div>
        <div className="card-actions">
          <button
            className={`action-btn ${copied ? 'action-btn--success' : ''}`}
            onClick={handleCopy}
            title="Copy it!"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button
            className="action-btn action-btn--danger"
            onClick={e => { e.stopPropagation(); onDelete(prompt.id) }}
            title="Delete this"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </article>
  )
}
