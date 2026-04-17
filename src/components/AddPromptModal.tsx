import { useState, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { X, FileText, Plus, Star } from 'lucide-react'
import { Prompt } from '../types'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`

interface AddPromptModalProps {
  categories: string[]
  editingPrompt: Prompt | null
  onSave: (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>) => void
  onClose: () => void
  onAddCategory: (name: string) => void
}

export default function AddPromptModal({
  categories,
  editingPrompt,
  onSave,
  onClose,
  onAddCategory,
}: AddPromptModalProps) {
  const [title, setTitle] = useState(editingPrompt?.title ?? '')
  const [category, setCategory] = useState(editingPrompt?.category ?? (categories[0] ?? 'General'))
  const [content, setContent] = useState(editingPrompt?.content ?? '')
  const [starred, setStarred] = useState(editingPrompt?.starred ?? false)
  const [newCatMode, setNewCatMode] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfMsg, setPdfMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const extractPdf = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setPdfMsg('Please upload a PDF file.')
      return
    }
    setPdfLoading(true)
    setPdfMsg('')
    try {
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      let text = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const tc = await page.getTextContent()
        text += (tc.items as Array<{ str?: string }>)
          .map(item => item.str ?? '')
          .join(' ') + '\n'
      }
      const cleaned = text.replace(/\s+/g, ' ').trim()
      setContent(prev => (prev ? prev + '\n\n' + cleaned : cleaned))
      setPdfMsg(`Extracted ${cleaned.length.toLocaleString()} characters from "${file.name}"`)
    } catch {
      setPdfMsg('Could not read this PDF. Try another file.')
    } finally {
      setPdfLoading(false)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) extractPdf(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) extractPdf(file)
  }

  const handleAddCat = () => {
    const name = newCatName.trim()
    if (name) {
      onAddCategory(name)
      setCategory(name)
      setNewCatName('')
      setNewCatMode(false)
    }
  }

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return
    onSave({ title: title.trim(), content: content.trim(), category, starred })
  }

  const isValid = title.trim().length > 0 && content.trim().length > 0

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">
            {editingPrompt ? 'Edit Prompt' : '✦ New Prompt'}
          </h2>
          <div className="modal-header-actions">
            <button
              className={`modal-star-btn ${starred ? 'modal-star-btn--on' : ''}`}
              onClick={() => setStarred(v => !v)}
              title={starred ? 'Remove star' : 'Mark as starred'}
            >
              <Star size={18} fill={starred ? 'currentColor' : 'none'} />
              {starred ? 'Starred' : 'Star it'}
            </button>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Prompt Title *</label>
            <input
              className="form-input"
              placeholder="Give this prompt a memorable name..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">Category</label>
            {!newCatMode ? (
              <div className="category-row">
                <select
                  className="form-select"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setNewCatMode(true)}
                  title="Create new category"
                >
                  <Plus size={15} />
                </button>
              </div>
            ) : (
              <div className="category-row">
                <input
                  className="form-input"
                  placeholder="New category name..."
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCat()}
                  autoFocus
                />
                <button type="button" className="btn-sm-primary" onClick={handleAddCat}>Add</button>
                <button type="button" className="btn-sm-ghost" onClick={() => setNewCatMode(false)}>
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* PDF Upload */}
          <div className="form-group">
            <label className="form-label">Upload PDF <span className="label-optional">(optional)</span></label>
            <div
              className={`pdf-zone ${dragOver ? 'pdf-zone--drag' : ''} ${pdfLoading ? 'pdf-zone--loading' : ''}`}
              onClick={() => !pdfLoading && fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {pdfLoading ? (
                <div className="pdf-loading">
                  <div className="spinner" />
                  <span>Extracting text from PDF...</span>
                </div>
              ) : (
                <>
                  <FileText size={28} className="pdf-icon" />
                  <p className="pdf-zone-text">Drop your PDF here</p>
                  <p className="pdf-zone-sub">or click to browse — text will be extracted automatically</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {pdfMsg && (
              <p className={`pdf-msg ${pdfMsg.includes('Could not') ? 'pdf-msg--error' : 'pdf-msg--success'}`}>
                {pdfMsg}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="form-group">
            <label className="form-label">
              Prompt Content *
              {content.length > 0 && (
                <span className="char-count-label">{content.length.toLocaleString()} chars</span>
              )}
            </label>
            <textarea
              className="form-textarea"
              placeholder="Type or paste your prompt here. Go wild — the longer, the better for your AI twin!"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={10}
            />
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
