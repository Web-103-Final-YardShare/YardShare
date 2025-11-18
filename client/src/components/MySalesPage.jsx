import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Layout } from './Layout'
import { LoadingSpinner } from './LoadingSpinner'
import { LocationPicker } from './LocationPicker'
import { getPrimaryPhotoUrl, getAllPhotoUrls } from '../utils/photoHelpers'

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
      
      // Load items for each listing to show item photos
      const listingsWithItems = await Promise.all(
        data.map(async (listing) => {
          try {
            const itemsRes = await fetch(`${API_BASE}/api/listings/${listing.id}/items`, { credentials: 'include' })
            if (itemsRes.ok) {
              const items = await itemsRes.json()
              return { ...listing, itemsLoaded: items }
            }
          } catch (e) {
            console.error(`Failed to load items for listing ${listing.id}:`, e)
          }
          return listing
        })
      )
      
      setListings(listingsWithItems)
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
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Please log in</h2>
        <p className="text-gray-600">You need to be logged in to view your listings.</p>
      </div>
    </div>
  ) : (
    <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">My Yard Sales</h1>
        {loading && <LoadingSpinner text="Loading your listings..." />}
        {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">{error}</div>}
        {!loading && !error && listings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No listings yet. Create one!</p>
            <a href="/create" className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Create Listing</a>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(l => (
            <div key={l.id} className="border rounded-lg overflow-hidden bg-white">
              {
                (() => {
                  const photos = l.photos || []
                  const src = Array.isArray(photos) && photos.length > 0 ? photos[0] : l.image_url
                  return src ? (<img src={src} alt={l.title} className="w-full h-40 object-cover" />) : null
                })()
              }
              <div className="p-4">
                <h3 className="font-medium text-gray-900">{l.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{l.location || 'No location'}</p>
                {l.item_count > 0 && (
                  <p className="text-sm text-gray-500 mb-2">{l.item_count} item{l.item_count !== 1 ? 's' : ''}</p>
                )}
                <div className="flex flex-wrap gap-2 mb-3">
                  {(() => {
                    // Show item photos if available
                    const itemsWithPhotos = (l.itemsLoaded || []).filter(item => item.image_url)
                    if (itemsWithPhotos.length > 0) {
                      return itemsWithPhotos.slice(0, 4).map((item, i) => (
                        <img key={i} src={item.image_url} alt={item.title} className="w-12 h-12 object-cover rounded" title={item.title} />
                      ))
                    }
                    // Fallback to listing photos
                    return (l.photos || []).slice(0, 4).map((p, i) => (
                      <img key={i} src={p.url} alt="photo" className={`w-12 h-12 object-cover rounded ${p.is_primary ? 'ring-2 ring-emerald-500' : ''}`} />
                    ))
                  })()}
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
                          body: JSON.stringify({ is_active: !l.is_active })
                        })
                        const d = await res.json()
                        if (!res.ok) throw new Error(d?.error || 'Update failed')
                        setListings(ls => ls.map(x => (x.id === l.id ? d : x)))
                        toast.success(d.is_active ? 'Marked as active' : 'Marked as inactive')
                      } catch (e) {
                        toast.error(e.message || 'Failed to update')
                      } finally {
                        setUpdating(u => ({ ...u, [l.id]: false }))
                      }
                    }}
                    className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating[l.id] ? 'Updating...' : l.is_active ? 'Mark Inactive' : 'Mark Active'}
                  </button>
                  <button
                    onClick={async () => {
                      const photos = l.photos || []
                      // Fetch items for this listing
                      let itemsData = []
                      try {
                        const itemsRes = await fetch(`${API_BASE}/api/listings/${l.id}/items`, { credentials: 'include' })
                        if (itemsRes.ok) {
                          itemsData = await itemsRes.json()
                        }
                      } catch (e) {
                        console.error('Failed to load items:', e)
                      }
                      // Store items in state for display
                      setListings(ls => ls.map(x => x.id === l.id ? { ...x, itemsLoaded: itemsData } : x))
                      setEditForm({
                        id: l.id,
                        title: l.title || '',
                        description: l.description || '',
                        sale_date: l.sale_date ? l.sale_date.split('T')[0] : '',
                        start_time: l.start_time || '',
                        end_time: l.end_time || '',
                        pickup_notes: l.pickup_notes || '',
                        location: l.location || '',
                        latitude: l.latitude ?? null,
                        longitude: l.longitude ?? null,
                        replacePhotos: false,
                        files: [],
                        existingPhotos: photos, // Array of URL strings
                        primaryIndex: 0,
                        items: itemsData.length > 0 ? itemsData.map(it => ({
                          title: it.title || '',
                          description: it.description || '',
                          price: it.price != null ? String(it.price) : '',
                          category_id: it.category_id || '',
                          image_url: it.image_url || '',
                          condition: it.condition || 'good',
                          photo: null // for new photo uploads
                        })) : [{ title: '', description: '', price: '', category_id: '', image_url: '', condition: 'good', photo: null }]
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
            // Validate items
            const itemErrors = []
            const allowedConditions = ['excellent', 'good', 'fair', 'poor']
            ;(editForm.items || []).forEach((it, idx) => {
              const itemErr = {}
              if (!it.title || String(it.title).trim() === '') itemErr.title = 'Title is required'
              const cond = it.condition ? String(it.condition).toLowerCase() : ''
              if (!allowedConditions.includes(cond)) itemErr.condition = 'Condition is required'
              if (it.price !== '' && it.price !== null && it.price !== undefined) {
                const p = Number(it.price)
                if (isNaN(p) || p < 0) itemErr.price = 'Price must be non-negative'
              }
              itemErrors[idx] = itemErr
            })
            const hasItemErrors = itemErrors.some(e => e && Object.keys(e).length > 0)
            if (hasItemErrors) {
              toast.error('Please fix item errors before saving')
              return
            }

            setSavingEdit(true)
            try {
              let res, d
              const id = editForm.id
              const baseFields = {
                title: editForm.title,
                description: editForm.description,
                sale_date: editForm.sale_date || null,
                start_time: editForm.start_time || null,
                end_time: editForm.end_time || null,
                pickup_notes: editForm.pickup_notes,
                location: editForm.location,
                latitude: editForm.latitude,
                longitude: editForm.longitude,
                items: (editForm.items || []).map(it => ({
                  title: it.title,
                  description: it.description,
                  price: it.price === '' || it.price === null ? 0 : Number(it.price),
                  category_id: it.category_id ? Number(it.category_id) : null,
                  image_url: it.image_url || null,
                  condition: it.condition || 'good',
                  hasPhoto: !!it.photo // flag to indicate photo will be uploaded
                }))
              }

              const replacing = !!editForm.replacePhotos
              const hasFiles = Array.isArray(editForm.files) && editForm.files.length > 0
              const hasItemPhotos = (editForm.items || []).some(it => it.photo)

              if ((replacing && hasFiles) || hasItemPhotos) {
                const fd = new FormData()
                Object.entries(baseFields).forEach(([k, v]) => {
                  if (k === 'items') {
                    fd.append('items', JSON.stringify(v))
                  } else if (v !== undefined && v !== null && v !== '') {
                    fd.append(k, String(v))
                  }
                })
                
                if (replacing && hasFiles) {
                  fd.append('primaryIndex', String(editForm.primaryIndex || 0))
                  for (const f of editForm.files) fd.append('photos', f)
                }
                
                // Append item photos with indexed field names
                (editForm.items || []).forEach((it, idx) => {
                  if (it.photo) {
                    fd.append(`item_photo_${idx}`, it.photo)
                  }
                })
                
                res = await fetch(`${API_BASE}/api/listings/${id}`, {
                  method: 'PATCH',
                  credentials: 'include',
                  body: fd
                })
                d = await res.json()
              } else if (replacing && !hasFiles) {
                // User requested to replace photos but didn't upload files: clear photos
                const payload = {
                  ...baseFields,
                  photos: [],
                  primaryIndex: 0,
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
              
              // Reload items for the updated listing
              try {
                const itemsRes = await fetch(`${API_BASE}/api/listings/${editForm.id}/items`, { credentials: 'include' })
                if (itemsRes.ok) {
                  const items = await itemsRes.json()
                  d.itemsLoaded = items
                }
              } catch (e) {
                console.error('Failed to reload items after update:', e)
              }
              
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
  const [itemErrors, setItemErrors] = useState([])
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-full max-w-2xl rounded-lg shadow p-6 max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Sale date</label>
              <input type="date" value={form.sale_date} onChange={e => setForm(f => ({ ...f, sale_date: e.target.value }))} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Start time</label>
              <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">End time</label>
              <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="w-full border rounded px-3 py-2" />
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

          {/* Items section */}
          <div className="pt-4">
            <h3 className="font-semibold mb-2">Items (add one or more)</h3>
            {(form.items || []).map((it, idx) => (
              <div key={idx} className="mb-3 p-3 border rounded bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <strong>Item {idx + 1}</strong>
                  <button type="button" onClick={() => {
                    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
                  }} className="text-sm text-red-600">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Title</label>
                    <input value={it.title} onChange={e => { setForm(f => { const items = [...f.items]; items[idx] = { ...items[idx], title: e.target.value }; return { ...f, items } }); setItemErrors([]) }} className={`w-full border rounded px-3 py-2 ${itemErrors[idx] && itemErrors[idx].title ? 'border-red-500' : ''}`} />
                    {itemErrors[idx] && itemErrors[idx].title && <div className="text-xs text-red-600 mt-1">{itemErrors[idx].title}</div>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Price</label>
                    <input type="number" min="0" step="0.01" value={it.price} onChange={e => { setForm(f => { const items = [...f.items]; items[idx] = { ...items[idx], price: e.target.value }; return { ...f, items } }); setItemErrors([]) }} className={`w-full border rounded px-3 py-2 ${itemErrors[idx] && itemErrors[idx].price ? 'border-red-500' : ''}`} />
                    {itemErrors[idx] && itemErrors[idx].price && <div className="text-xs text-red-600 mt-1">{itemErrors[idx].price}</div>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Category</label>
                    <select value={it.category_id} onChange={e => { setForm(f => { const items = [...f.items]; items[idx] = { ...items[idx], category_id: e.target.value }; return { ...f, items } }); setItemErrors([]) }} className="w-full border rounded px-3 py-2">
                      <option value="">Select category</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Condition</label>
                    <select value={it.condition} onChange={e => { setForm(f => { const items = [...f.items]; items[idx] = { ...items[idx], condition: e.target.value }; return { ...f, items } }); setItemErrors([]) }} className={`w-full border rounded px-3 py-2 ${itemErrors[idx] && itemErrors[idx].condition ? 'border-red-500' : ''}`}>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                  {itemErrors[idx] && itemErrors[idx].condition && <div className="col-span-2 text-xs text-red-600 mt-1">{itemErrors[idx].condition}</div>}
                </div>
                <div className="mt-2">
                  <label className="block text-sm text-gray-700 mb-1">Description (optional)</label>
                  <input value={it.description} onChange={e => { setForm(f => { const items = [...f.items]; items[idx] = { ...items[idx], description: e.target.value }; return { ...f, items } }); setItemErrors([]) }} className="w-full border rounded px-3 py-2" />
                </div>
                <div className="mt-2">
                  <label className="block text-sm text-gray-700 mb-1">Item Photo</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-emerald-400 transition-colors cursor-pointer" onClick={() => document.getElementById(`edit-item-file-input-${idx}`).click()}>
                    <input id={`edit-item-file-input-${idx}`} type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { setForm(f => { const items = [...f.items]; items[idx] = { ...items[idx], photo: file, image_url: '' }; return { ...f, items } }); setItemErrors([]) } }} />
                    {it.photo ? (
                      <div className="relative">
                        <img src={URL.createObjectURL(it.photo)} alt="Preview" className="max-h-32 mx-auto rounded" />
                        <button type="button" onClick={e => { e.stopPropagation(); setForm(f => { const items = [...f.items]; items[idx] = { ...items[idx], photo: null }; return { ...f, items } }) }} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs">×</button>
                        <p className="text-xs text-gray-600 mt-1">{it.photo.name}</p>
                      </div>
                    ) : it.image_url ? (
                      <div>
                        <img src={it.image_url} alt="Current" className="max-h-32 mx-auto rounded mb-2" />
                        <p className="text-xs text-gray-600">Click to replace</p>
                      </div>
                    ) : (
                      <div>
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div>
              <button type="button" onClick={() => setForm(f => ({ ...f, items: [...(f.items || []), { title: '', description: '', price: '', category_id: '', image_url: '', condition: 'good' }] }))} className="px-3 py-1 rounded bg-sky-600 text-white">Add item</button>
            </div>
          </div>

          <div className="pt-2">
            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-2">Current Listing Photos</label>
              {form.existingPhotos && form.existingPhotos.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {form.existingPhotos.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded" />
                      {i === 0 && <span className="absolute bottom-0 left-0 bg-emerald-500 text-white text-xs px-1 rounded">Primary</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No photos yet</p>
              )}
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.replacePhotos} onChange={e => setForm(f => ({ ...f, replacePhotos: e.target.checked }))} />
              Replace listing photos
            </label>
            {form.replacePhotos && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Upload new listing photos</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer" onClick={() => document.getElementById('edit-listing-file-input').click()}>
                    <input id="edit-listing-file-input" type="file" multiple accept="image/*" className="hidden" onChange={e => setForm(f => ({ ...f, files: Array.from(e.target.files || []) }))} />
                    {Array.isArray(form.files) && form.files.length > 0 ? (
                      <div>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {form.files.map((file, i) => (
                            <div key={i} className="relative">
                              <img src={URL.createObjectURL(file)} alt={`Preview ${i + 1}`} className="w-full h-24 object-cover rounded" />
                              <button type="button" onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, files: f.files.filter((_, idx) => idx !== i) })) }} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs">×</button>
                              {form.primaryIndex === i && <span className="absolute bottom-0 left-0 bg-emerald-500 text-white text-xs px-1 rounded">Primary</span>}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-600">{form.files.length} file(s) selected</p>
                      </div>
                    ) : (
                      <div>
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                      </div>
                    )}
                  </div>
                  {Array.isArray(form.files) && form.files.length > 0 && (
                    <div className="mt-2">
                      <label className="block text-sm text-gray-700 mb-1">Primary photo</label>
                      <select value={form.primaryIndex} onChange={e => setForm(f => ({ ...f, primaryIndex: Number(e.target.value) }))} className="border rounded px-2 py-1">
                        {form.files.map((_, i) => (
                          <option key={i} value={i}>Photo {i + 1}</option>
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
