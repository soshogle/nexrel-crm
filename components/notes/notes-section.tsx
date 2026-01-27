
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  AlertCircle,
  Clock 
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

interface Note {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
}

interface NotesSectionProps {
  leadId: string
  notes: Note[]
}

export function NotesSection({ leadId, notes: initialNotes }: NotesSectionProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [newNote, setNewNote] = useState('')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    setIsAdding(true)
    setError('')

    try {
      const response = await fetch(`/api/leads/${leadId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newNote }),
      })

      if (response.ok) {
        const note = await response.json()
        setNotes(prev => [note, ...prev])
        setNewNote('')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to add note')
      }
    } catch (error) {
      console.error('Add note error:', error)
      setError('An error occurred while adding the note')
    } finally {
      setIsAdding(false)
    }
  }

  const handleEditNote = (note: Note) => {
    setEditingNote(note.id)
    setEditContent(note.content)
  }

  const handleUpdateNote = async () => {
    if (!editContent.trim() || !editingNote) return

    setIsUpdating(true)
    setError('')

    try {
      const response = await fetch(`/api/notes/${editingNote}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent }),
      })

      if (response.ok) {
        const updatedNote = await response.json()
        setNotes(prev => prev.map(note => 
          note.id === editingNote ? updatedNote : note
        ))
        setEditingNote(null)
        setEditContent('')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update note')
      }
    } catch (error) {
      console.error('Update note error:', error)
      setError('An error occurred while updating the note')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setNotes(prev => prev.filter(note => note.id !== noteId))
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete note')
      }
    } catch (error) {
      console.error('Delete note error:', error)
      setError('An error occurred while deleting the note')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Add New Note */}
      <div className="space-y-3">
        <Textarea
          placeholder="Add a note about this lead..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={3}
        />
        <Button 
          onClick={handleAddNote} 
          disabled={!newNote.trim() || isAdding}
          size="sm"
        >
          {isAdding ? (
            'Adding...'
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </>
          )}
        </Button>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        <AnimatePresence>
          {notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              {editingNote === note.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                  />
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={handleUpdateNote}
                      disabled={!editContent.trim() || isUpdating}
                    >
                      {isUpdating ? (
                        'Updating...'
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setEditingNote(null)
                        setEditContent('')
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDistanceToNow(new Date(note.createdAt))} ago
                      {note.updatedAt !== note.createdAt && (
                        <span className="ml-2">(edited)</span>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditNote(note)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {notes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No notes yet. Add your first note about this lead.</p>
          </div>
        )}
      </div>
    </div>
  )
}
