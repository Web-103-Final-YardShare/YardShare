import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Layout } from './Layout'
import { LocationPicker } from './LocationPicker'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function CreateSalePage({ isAuthenticated, user, favoritesCount, onLogout }) {
  const [categories, setCategories] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category_id: '',
    pickup_notes: '',
    location: '',
    latitude: null,
    longitude: null,
    photos: [''],
    primaryIndex: 0,
  })
  const [files, setFiles] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`)
        const data = await res.json()
        setCategories(data)
      } catch (e) {
        console.error('Failed to load categories', e)
      }
    }
    load()
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    
    // Frontend validation
    if (!form.title || form.title.trim().length === 0) {
      setError('Title is required')
      toast.error('Title is required')
      return
    }
    if (form.title.trim().length > 255) {
      setError('Title must be 255 characters or less')
      toast.error('Title must be 255 characters or less')
      return
    }
    if (form.price && (isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0)) {
      setError('Price must be a non-negative number')
      toast.error('Price must be a non-negative number')
      return
    }
    
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      let res
      if (files && files.length > 0) {
        const fd = new FormData()
        fd.append('title', form.title)
        fd.append('description', form.description)
        if (form.price) fd.append('price', String(Number(form.price)))
        if (form.category_id) fd.append('category_id', String(Number(form.category_id)))
        fd.append('pickup_notes', form.pickup_notes)
        fd.append('location', form.location)
        if (form.latitude != null) fd.append('latitude', String(form.latitude))
        if (form.longitude != null) fd.append('longitude', String(form.longitude))
        fd.append('primaryIndex', String(form.primaryIndex || 0))
        for (const f of files) fd.append('photos', f)
        res = await fetch(`${API_BASE}/api/listings`, {
          method: 'POST',
          credentials: 'include',
          body: fd,
        })
      } else {
        const payload = {
          title: form.title,
          description: form.description,
          price: form.price ? Number(form.price) : null,
          category_id: form.category_id ? Number(form.category_id) : null,
          pickup_notes: form.pickup_notes,
          location: form.location,
          latitude: form.latitude,
          longitude: form.longitude,
          photos: form.photos.filter(Boolean),
          primaryIndex: form.primaryIndex,
        }
        res = await fetch(`${API_BASE}/api/listings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create')
      setSuccess('Listing created!')
      toast.success('Listing created successfully!')
      // Reset minimal
      setForm({ title: '', description: '', price: '', category_id: '', pickup_notes: '', location: '', latitude: null, longitude: null, photos: [''], primaryIndex: 0 })
      setFiles([])
    } catch (e) {
      setError(e.message)
      toast.error(e.message || 'Failed to create listing')
    } finally {
      setSubmitting(false)
    }
  }

  const content = !isAuthenticated ? (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-gray-600">Please login to host a sale.</p>
    </div>
  ) : (
    <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl mb-6">Host a Yard Sale</h1>
        <form onSubmit={onSubmit} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} className="space-y-6 bg-white p-6 rounded-lg border">
          {error && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>}
          {success && <div className="p-3 bg-green-50 text-green-700 border border-green-200 rounded">{success}</div>}

          <div>
            <label className="block text-sm text-gray-700 mb-1">Title</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full border rounded px-3 py-2" rows={4} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Price (optional)</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Category</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="w-full border rounded px-3 py-2">
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Pickup notes</label>
            <input value={form.pickup_notes} onChange={e => setForm(f => ({ ...f, pickup_notes: e.target.value }))} className="w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Display location (text)</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full border rounded px-3 py-2" placeholder="e.g., 123 Main St, San Francisco" />
          </div>

          <div>
            <LocationPicker value={{ address: form.location, latitude: form.latitude, longitude: form.longitude }} onChange={(loc) => setForm(f => ({ ...f, location: loc.address || f.location, latitude: loc.latitude, longitude: loc.longitude }))} />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Upload photos</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={e => setFiles(Array.from(e.target.files || []))}
              className="w-full border rounded px-3 py-2 bg-white"
            />
            {files && files.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">{files.length} file(s) selected. Primary index applies to upload order.</p>
            )}
          </div>

          <div className="pt-2">
            <button disabled={submitting} className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50">
              {submitting ? 'Creating…' : 'Create Listing'}
            </button>
          </div>
        </form>
      </div>
  )

  return (
    <Layout isAuthenticated={isAuthenticated} user={user} favoritesCount={favoritesCount} onLogout={onLogout}>
      {content}
    </Layout>
  )
}
