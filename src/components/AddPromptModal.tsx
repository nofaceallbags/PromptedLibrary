import { useState, useRef, useCallback } from 'react'
import { X, FileText, Plus, Star, ChevronLeft, Check } from 'lucide-react'
import { Prompt } from '../types'

interface AddPromptModalProps {
  categories: string[]
  editingPrompt: Prompt | null
  onSave: (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>) => void
  onSaveMultiple: (items: Array<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>>) => void
  onClose: () => void
  onAddCategory: (name: string) => void
}

interface ParsedPrompt {
  tempId: string
  title: string
  content: string
  selected: boolean
}

function splitPrompts(raw: string): string[] {
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()

  const byNumberedDot = text.split(/\n\s*\d{1,3}\.\s+/).map(s => s.trim()).filter(s => s.length > 15)
  if (byNumberedDot.length > 1) return byNumberedDot

  const byNumberedParen = text.split(/\n\s*\d{1,3}\)\s+/).map(s => s.trim()).filter(s => s.length > 15)
  if (byNumberedParen.length > 1) return byNumberedParen

  const byBullet = text.split(/\n\s*[•●▪▸◆\-\*]\s+/).map(s => s.trim()).filter(s => s.length > 15)
  if (byBullet.length > 1) return byBullet

  const byHeader = text.split(/\nPrompt\s*\d+[:.]?\s*/i).map(s => s.trim()).filter(s => s.length > 15)
  if (byHeader.length > 1) return byHeader

  const byParagraph = text.split(/\n{2,}/).map(s => s.replace(/\n/g, ' ').trim()).filter(s => s.length > 30)
  if (byParagraph.length > 1) return byParagraph

  return [text]
}

function autoTitle(content: string): string {
  const flat = content.trim().replace(/\n/g, ' ')
  const words = flat.split(/\s+/).slice(0, 7).join(' ')
  return words.length < flat.length ? words + '…' : words
}

export default function AddPromptModal({
  categories,
  editingPrompt,
  onSave,
  onSaveMultiple,
  onClose,
  onAddCategory,
}: AddPromptModalProps) {
  const [view, setView] = useState<'form' | 'pdf-review'>('form')

  // Form state
  const [title, setTitle] = useState(editingPrompt?.title ?? '')
  const [category, setCategory] = useState(editingPrompt?.category ?? (categories[0] ?? 'Personality'))
  const [content, setContent] = useState(editingPrompt?.content ?? '')
  const [starred, setStarred] = useState(editingPrompt?.starred ?? false)
  const [newCatMode, setNewCatMode] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfMsg, setPdfMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)

  // PDF review state
  const [parsedPrompts, setParsedPrompts] = useState<ParsedPrompt[]>([])
  const [bulkCategory, setBulkCategory] = useState(categories[0] ?? 'Personality')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const extractPdf = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') { setPdfMsg('Oops! That needs to be a PDF file!'); return }
    setPdfLoading(true)
    setPdfMsg('')
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`

      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      let raw = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const tc = await page.getTextContent()
        raw += (tc.items as Array<{ str?: string }>).map(it => it.str ?? '').join(' ') + '\n'
      }

      const chunks = splitPrompts(raw)

      if (chunks.length === 1) {
        // Single prompt — just fill the textarea
        setContent(chunks[0])
        setPdfMsg(`Got it! We found ${chunks[0].length.toLocaleString()} letters. Give it a name and save!`)
      } else {
        // Multiple prompts — switch to review view
        setParsedPrompts(
          chunks.map((c, i) => ({
            tempId: `${Date.now()}-${i}`,
            title: autoTitle(c),
            content: c,
            selected: true,
          }))
        )
        setBulkCategory(category)
        setView('pdf-review')
      }
    } catch (err) {
      console.error('PDF error:', err)
      setPdfMsg('Hmm, we couldn\'t read that PDF. Try a different one!')
    } finally {
      setPdfLoading(false)
    }
  }, [category])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) extractPdf(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) extractPdf(file)
  }

  const handleAddCat = () => {
    const name = newCatName.trim()
    if (name) { onAddCategory(name); setCategory(name); setNewCatName(''); setNewCatMode(false) }
  }

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return
    onSave({ title: title.trim(), content: content.trim(), category, starred })
  }

  const selectedCount = parsedPrompts.filter(p => p.selected).length

  const handleSaveAll = () => {
    const items = parsedPrompts
      .filter(p => p.selected && p.content.trim())
      .map(p => ({ title: p.title || autoTitle(p.content), content: p.content, category: bulkCategory, starred: false }))
    if (items.length) onSaveMultiple(items)
  }

  const toggleAll = () => {
    const allSelected = parsedPrompts.every(p => p.selected)
    setParsedPrompts(prev => prev.map(p => ({ ...p, selected: !allSelected })))
  }

  const isValid = title.trim().length > 0 && content.trim().length > 0

  // ── PDF Review View ──────────────────────────────────────────────────
  if (view === 'pdf-review') {
    return (
      <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <div className="modal modal--wide" role="dialog" aria-modal="true">
          <div className="modal-header">
            <div className="modal-title-row">
              <button className="back-btn" onClick={() => setView('form')}>
                <ChevronLeft size={18} /> Back
              </button>
              <h2 className="modal-title">Your PDF Prompts</h2>
            </div>
            <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
          </div>

          <div className="review-toolbar">
            <div className="review-cat-row">
              <span className="form-label" style={{ marginBottom: 0 }}>Folder for all:</span>
              <select className="form-select review-cat-select" value={bulkCategory}
                onChange={e => setBulkCategory(e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="review-meta">
              <span className="review-count"><span>{selectedCount}</span> of {parsedPrompts.length} chosen</span>
              <button className="select-all-btn" onClick={toggleAll}>
                {parsedPrompts.every(p => p.selected) ? 'Uncheck All' : 'Check All'}
              </button>
            </div>
          </div>

          <div className="modal-body review-body">
            <div className="pdf-prompt-list">
              {parsedPrompts.map((p, i) => (
                <div key={p.tempId} className={`pdf-prompt-item ${p.selected ? 'pdf-prompt-item--on' : ''}`}>
                  <button
                    className={`pdf-checkbox ${p.selected ? 'pdf-checkbox--on' : ''}`}
                    onClick={() => setParsedPrompts(prev =>
                      prev.map((x, xi) => xi === i ? { ...x, selected: !x.selected } : x)
                    )}
                  >
                    {p.selected && <Check size={12} />}
                  </button>
                  <div className="pdf-prompt-body">
                    <input
                      className="pdf-title-input"
                      value={p.title}
                      onChange={e => setParsedPrompts(prev =>
                        prev.map((x, xi) => xi === i ? { ...x, title: e.target.value } : x)
                      )}
                      placeholder="Give it a name..."
                    />
                    <p className="pdf-preview">{p.content}</p>
                  </div>
                  <span className="pdf-num">#{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveAll} disabled={selectedCount === 0}>
              Save {selectedCount} Prompt{selectedCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Standard Form View ───────────────────────────────────────────────
  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{editingPrompt ? 'Edit Your Prompt' : '✦ Add a New Prompt'}</h2>
          <div className="modal-header-actions">
            <button
              className={`modal-star-btn ${starred ? 'modal-star-btn--on' : ''}`}
              onClick={() => setStarred(v => !v)}
            >
              <Star size={18} fill={starred ? 'currentColor' : 'none'} />
              {starred ? 'Favorited ⭐' : 'Add to Favorites'}
            </button>
            <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
          </div>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Give it a Name *</label>
            <input className="form-input" placeholder="Example: My funny AI helper..."
              value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Folder</label>
            {!newCatMode ? (
              <div className="category-row">
                <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="button" className="btn-icon" onClick={() => setNewCatMode(true)}>
                  <Plus size={15} />
                </button>
              </div>
            ) : (
              <div className="category-row">
                <input className="form-input" placeholder="New folder name..." value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCat()} autoFocus />
                <button type="button" className="btn-sm-primary" onClick={handleAddCat}>Add</button>
                <button type="button" className="btn-sm-ghost" onClick={() => setNewCatMode(false)}><X size={14} /></button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Upload a PDF <span className="label-optional">(we'll read it and save each prompt for you!)</span>
            </label>
            <div
              className={`pdf-zone ${dragOver ? 'pdf-zone--drag' : ''} ${pdfLoading ? 'pdf-zone--loading' : ''}`}
              onClick={() => !pdfLoading && fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {pdfLoading ? (
                <div className="pdf-loading"><div className="spinner" /><span>Reading your PDF... ✨</span></div>
              ) : (
                <>
                  <FileText size={28} className="pdf-icon" />
                  <p className="pdf-zone-text">Drop your PDF here! 📄</p>
                  <p className="pdf-zone-sub">We'll save each prompt on its own</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,application/pdf"
              style={{ display: 'none' }} onChange={handleFileChange} />
            {pdfMsg && (
              <p className={`pdf-msg ${pdfMsg.includes('Could not') ? 'pdf-msg--error' : 'pdf-msg--success'}`}>
                {pdfMsg}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Your Prompt *
              {content.length > 0 && <span className="char-count-label">{content.length.toLocaleString()} letters</span>}
            </label>
            <textarea className="form-textarea"
              placeholder="Type or paste your prompt here..."
              value={content} onChange={e => setContent(e.target.value)} rows={10} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!isValid}>
            {editingPrompt ? 'Save Changes' : 'Save Prompt'}
          </button>
        </div>
      </div>
    </div>
  )
}
