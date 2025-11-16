import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Layout } from './Layout'
import { LoadingSpinner } from './LoadingSpinner'
import { LocationPicker } from './LocationPicker'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function MySalesPage({ isAuthenticated, user, favoritesCount, onLogout }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState({})
  const [categories, setCategories] = useState([])
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/listings/my-listings`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load')
      setListings(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // fetch categories for edit form
    const fetchCats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`)
        const data = await res.json()
        if (Array.isArray(data)) setCategories(data)
      } catch { /* ignore */ }
    }
    fetchCats()
  }, [])

  const onDelete = async (id) => {
    if (!confirm('Delete this listing?')) return
    try {
      const res = await fetch(`${API_BASE}/api/listings/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.error || 'Delete failed')
      }
      setListings(ls => ls.filter(l => l.id !== id))
      toast.success('Listing deleted successfully')
    } catch (e) {
      toast.error(e.message || 'Failed to delete listing')
    }
  }

  const content = !isAuthenticated ? (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-gray-600">Please login to view your listings.</p>
    </div>
  ) : (
    <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl mb-4">My Yard Sales</h1>
        {loading && <LoadingSpinner text="Loading your listings..." />}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && listings.length === 0 && <p className="text-gray-600">No listings yet. Create one!</p>}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(l => (
            <div key={l.id} className="border rounded-lg overflow-hidden bg-white">
              {l.image_url && (
                <img src={l.image_url.startsWith('/') ? (API_BASE + l.image_url) : l.image_url} alt={l.title} className="w-full h-40 object-cover" />
              )}
              <div className="p-4">
                <h3 className="font-medium text-gray-900">{l.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{l.category_name || 'Uncategorized'}</p>
                <p className="text-gray-800 mb-2">{l.price ? `$${l.price}` : 'Free / negotiable'}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(l.photos || []).map((p, i) => (
                    <img key={i} src={p.url} alt="photo" className={`w-12 h-12 object-cover rounded ${p.is_primary ? 'ring-2 ring-emerald-500' : ''}`} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {/* Simple edit: toggle availability */}
                  <button
                    disabled={updating[l.id]}
                    onClick={async () => {
                      setUpdating(u => ({ ...u, [l.id]: true }))
                      try {
                        const res = await fetch(`${API_BASE}/api/listings/${l.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ is_available: !l.is_available })
                        })
                        const d = await res.json()
                        if (!res.ok) throw new Error(d?.error || 'Update failed')
                        setListings(ls => ls.map(x => (x.id === l.id ? d : x)))
                        toast.success(d.is_available ? 'Marked as available' : 'Marked as unavailable')
                      } catch (e) {
                        toast.error(e.message || 'Failed to update')
                      } finally {
                        setUpdating(u => ({ ...u, [l.id]: false }))
                      }
                    }}
                    className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating[l.id] ? 'Updating...' : l.is_available ? 'Mark Unavailable' : 'Mark Available'}
                  </button>
                  <button
                    onClick={() => {
                      setEditForm({
                        id: l.id,
                        title: l.title || '',
                        description: l.description || '',
                        price: typeof l.price === 'number' ? String(l.price) : '',
                        category_id: l.category_id || '',
                        pickup_notes: l.pickup_notes || '',
                        location: l.location || '',
                        latitude: l.latitude ?? null,
                        longitude: l.longitude ?? null,
                        replacePhotos: false,
                        photosUrls: [''],
                        files: [],
                        primaryIndex: 0,
                      })
                      setShowEdit(true)
                    }}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button disabled={updating[l.id]} onClick={() => onDelete(l.id)} className="px-3 py-1 border rounded text-red-600 disabled:opacity-50">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
  )

  return (
    <Layout isAuthenticated={isAuthenticated} user={user} favoritesCount={favoritesCount} onLogout={onLogout}>
      {content}
      {showEdit && editForm && (
        <EditModal 
          categories={categories}
          form={editForm}
          setForm={setEditForm}
          saving={savingEdit}
          onClose={() => { setShowEdit(false); setEditForm(null) }}
          onSave={async () => {
            // Basic validation
            if (!editForm.title || editForm.title.trim().length === 0) {
              toast.error('Title is required')
              return
            }
            if (editForm.price && (isNaN(parseFloat(editForm.price)) || parseFloat(editForm.price) < 0)) {
              toast.error('Price must be a non-negative number')
              return
            }
            setSavingEdit(true)
            try {
              let res, d
              const id = editForm.id
              const baseFields = {
                title: editForm.title,
                description: editForm.description,
                price: editForm.price ? Number(editForm.price) : null,
                category_id: editForm.category_id ? Number(editForm.category_id) : null,
                pickup_notes: editForm.pickup_notes,
                location: editForm.location,
                latitude: editForm.latitude,
                longitude: editForm.longitude,
              }

              const replacing = !!editForm.replacePhotos
              const hasFiles = Array.isArray(editForm.files) && editForm.files.length > 0
              const hasUrls = Array.isArray(editForm.photosUrls) && editForm.photosUrls.filter(Boolean).length > 0

              if (replacing && hasFiles) {
                const fd = new FormData()
                Object.entries(baseFields).forEach(([k, v]) => {
                  if (v !== undefined && v !== null && v !== '') fd.append(k, String(v))
                })
                fd.append('primaryIndex', String(editForm.primaryIndex || 0))
                for (const f of editForm.files) fd.append('photos', f)
                res = await fetch(`${API_BASE}/api/listings/${id}`, {
                  method: 'PATCH',
                  credentials: 'include',
                  body: fd
                })
                d = await res.json()
              } else if (replacing && hasUrls) {
                const payload = {
                  ...baseFields,
                  photos: editForm.photosUrls.filter(Boolean),
                  primaryIndex: editForm.primaryIndex || 0,
                }
                res = await fetch(`${API_BASE}/api/listings/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify(payload)
                })
                d = await res.json()
              } else {
                // No photo replacement, json update
                res = await fetch(`${API_BASE}/api/listings/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify(baseFields)
                })
                d = await res.json()
              }

              if (!res.ok) throw new Error(d?.error || 'Update failed')
              setListings(ls => ls.map(x => (x.id === editForm.id ? d : x)))
              toast.success('Listing updated')
              setShowEdit(false)
              setEditForm(null)
            } catch (e) {
              toast.error(e.message || 'Failed to update')
            } finally {
              setSavingEdit(false)
            }
          }}
        />
      )}
    </Layout>
  )
}

function EditModal({ categories, form, setForm, saving, onClose, onSave }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-full max-w-xl rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Edit Listing</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full border rounded px-3 py-2" rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Price</label>
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
          <div className="space-y-3">
            <label className="block text-sm text-gray-700">Location</label>
            <LocationPicker
              value={{ address: form.location || '', latitude: form.latitude, longitude: form.longitude }}
              onChange={(v) => setForm(f => ({ ...f, location: v.address || f.location, latitude: v.latitude ?? f.latitude, longitude: v.longitude ?? f.longitude }))}
            />
          </div>

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.replacePhotos} onChange={e => setForm(f => ({ ...f, replacePhotos: e.target.checked }))} />
              Replace photos
            </label>
            {form.replacePhotos && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Photo URLs</label>
                  <div className="space-y-2">
                    {form.photosUrls.map((u, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          value={u}
                          onChange={e => setForm(f => {
                            const arr = [...f.photosUrls]
                            arr[idx] = e.target.value
                            return { ...f, photosUrls: arr }
                          })}
                          placeholder="https://..."
                          className="flex-1 border rounded px-3 py-2"
                        />
                        <input
                          type="radio"
                          name="primaryUrl"
                          checked={form.primaryIndex === idx}
                          onChange={() => setForm(f => ({ ...f, primaryIndex: idx }))}
                          title="Primary"
                        />
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, photosUrls: f.photosUrls.filter((_, i) => i !== idx) }))}
                          className="px-2 py-1 border rounded text-sm"
                        >Remove</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setForm(f => ({ ...f, photosUrls: [...(f.photosUrls || []), ''] }))} className="px-3 py-1 border rounded text-sm">+ Add URL</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">Upload new photos</label>
                  <input type="file" multiple accept="image/*" onChange={e => setForm(f => ({ ...f, files: Array.from(e.target.files || []) }))} />
                  {Array.isArray(form.files) && form.files.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">{form.files.length} file(s) selected</div>
                  )}
                  {Array.isArray(form.files) && form.files.length > 0 && (
                    <div className="mt-2">
                      <label className="block text-sm text-gray-700 mb-1">Primary photo index</label>
                      <select value={form.primaryIndex} onChange={e => setForm(f => ({ ...f, primaryIndex: Number(e.target.value) }))} className="border rounded px-2 py-1">
                        {Array.from({ length: form.files.length }).map((_, i) => (
                          <option key={i} value={i}>{i + 1}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} disabled={!!saving} className="px-4 py-2 border rounded disabled:opacity-50">Cancel</button>
          <button onClick={onSave} disabled={!!saving} className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>
    </>
  )
}
