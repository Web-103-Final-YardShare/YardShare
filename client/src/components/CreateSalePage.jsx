import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Layout } from './Layout'
import { LocationPicker } from './LocationPicker'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function CreateSalePage({ isAuthenticated, user, favoritesCount, onLogout }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    sale_date: '',
    start_time: '',
    end_time: '',
    pickup_notes: '',
    location: '',
    latitude: null,
    longitude: null,
    photos: [],
    primaryIndex: 0,
    items: [
      { title: '', description: '', price: '', category_id: '', image_url: '', condition: 'good', photo: null }
    ],
  })
  const [files, setFiles] = useState([])
  const [itemErrors, setItemErrors] = useState([])
  const allowedConditions = ['excellent', 'good', 'fair', 'poor']

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
    // Client-side validation for items
    const errs = []
    ;(form.items || []).forEach((it, idx) => {
      const itemErr = {}
      if (!it.title || String(it.title).trim() === '') itemErr.title = 'Title is required'
      const cond = it.condition ? String(it.condition).toLowerCase() : ''
      if (!allowedConditions.includes(cond)) itemErr.condition = 'Condition is required and must be one of: excellent, good, fair, poor'
      if (it.price !== '' && it.price !== null && it.price !== undefined) {
        const p = Number(it.price)
        if (isNaN(p) || p < 0) itemErr.price = 'Price must be a non-negative number'
      }
      errs[idx] = itemErr
    })
    const hasItemErrors = errs.some(e => e && Object.keys(e).length > 0)
    if (hasItemErrors) {
      setItemErrors(errs)
      setError('Please fix item errors before submitting')
      toast.error('Please fix item errors before submitting')
      return
    }

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
    // (item-level prices are validated per-item)
    
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      let res
      // Always use FormData if we have either listing photos OR item photos
      const hasListingPhotos = files && files.length > 0
      const hasItemPhotos = (form.items || []).some(it => it.photo)
      
      if (hasListingPhotos || hasItemPhotos) {
        const fd = new FormData()
        fd.append('title', form.title)
        fd.append('description', form.description)
        if (form.sale_date) fd.append('sale_date', form.sale_date)
        if (form.start_time) fd.append('start_time', form.start_time)
        if (form.end_time) fd.append('end_time', form.end_time)
        fd.append('pickup_notes', form.pickup_notes)
        fd.append('location', form.location)
        if (form.latitude != null) fd.append('latitude', String(form.latitude))
        if (form.longitude != null) fd.append('longitude', String(form.longitude))
        fd.append('primaryIndex', String(form.primaryIndex || 0))
        
        // Include items as JSON string (without photo data)
        const itemsForSend = (form.items || []).map((it, idx) => ({
          title: it.title,
          description: it.description,
          price: it.price === '' || it.price === null ? 0 : Number(it.price),
          category_id: it.category_id ? Number(it.category_id) : null,
          condition: it.condition || 'good',
          hasPhoto: !!it.photo // flag to indicate photo will be uploaded
        }))
        fd.append('items', JSON.stringify(itemsForSend))
        
        // Append listing photos
        for (const f of files) fd.append('photos', f)
        
        // Append item photos with indexed field names
        (form.items || []).forEach((it, idx) => {
          if (it.photo) {
            fd.append(`item_photo_${idx}`, it.photo)
          }
        })
        
        res = await fetch(`${API_BASE}/api/listings`, {
          method: 'POST',
          credentials: 'include',
          body: fd,
        })
      } else {
        const payload = {
          title: form.title,
          description: form.description,
          sale_date: form.sale_date || null,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          pickup_notes: form.pickup_notes,
          location: form.location,
          latitude: form.latitude,
          longitude: form.longitude,
          photos: form.photos.filter(Boolean),
          primaryIndex: form.primaryIndex,
          items: (form.items || []).map(it => ({
            title: it.title,
            description: it.description,
            price: it.price === '' || it.price === null ? 0 : Number(it.price),
            category_id: it.category_id ? Number(it.category_id) : null,
            image_url: it.image_url || null,
            condition: it.condition || 'good'
          }))
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
      // Redirect to home after short delay
      setTimeout(() => navigate('/'), 500)
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

          <div>
            <LocationPicker value={{ address: form.location, latitude: form.latitude, longitude: form.longitude }} onChange={(loc) => setForm(f => ({ ...f, location: loc.address || f.location, latitude: loc.latitude, longitude: loc.longitude }))} />
          </div>

          {/* Photos section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photos (optional)</label>
            
            {/* Upload area */}
            <div 
              onClick={() => document.getElementById('file-input').click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                setFiles(droppedFiles);
              }}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-colors"
            >
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
            
            <input 
              id="file-input"
              type="file" 
              multiple 
              accept="image/*" 
              onChange={e => setFiles(Array.from(e.target.files || []))} 
              className="hidden"
            />
            
            {/* Image previews */}
            {files.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {files.map((file, idx) => (
                  <div 
                    key={idx} 
                    className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      form.primaryIndex === idx ? 'border-sky-500 shadow-lg ring-2 ring-sky-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setForm(f => ({ ...f, primaryIndex: idx }))}
                  >
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-32 object-cover"
                    />
                    {form.primaryIndex === idx && (
                      <div className="absolute top-2 right-2 bg-sky-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                        Primary
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newFiles = files.filter((_, i) => i !== idx);
                        setFiles(newFiles);
                        if (form.primaryIndex === idx) {
                          setForm(f => ({ ...f, primaryIndex: 0 }));
                        } else if (form.primaryIndex > idx) {
                          setForm(f => ({ ...f, primaryIndex: f.primaryIndex - 1 }));
                        }
                      }}
                      className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                      <p className="text-white text-xs truncate">{file.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {files.length > 0 && (
              <p className="mt-3 text-sm text-gray-500">
                {files.length} photo{files.length > 1 ? 's' : ''} selected. 
                {files.length > 1 && ' Click an image to set as primary.'}
              </p>
            )}
          </div>

          {/* Items section */}
          <div className="pt-4">
            <h2 className="font-semibold mb-2">Items (add one or more)</h2>
            {(form.items || []).map((it, idx) => (
              <div key={idx} className="mb-3 p-3 border rounded bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <strong>Item {idx + 1}</strong>
                  <div>
                    <button type="button" onClick={() => {
                      setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
                    }} className="text-sm text-red-600">Remove</button>
                  </div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item Photo (optional)</label>
                  
                  {/* Upload area for item */}
                  <div 
                    onClick={() => document.getElementById(`item-file-input-${idx}`).click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-colors"
                  >
                    <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-1 text-xs text-gray-600">Click to upload item photo</p>
                  </div>
                  
                  <input 
                    id={`item-file-input-${idx}`}
                    type="file" 
                    accept="image/*"
                    onChange={e => { 
                      const file = e.target.files?.[0] || null
                      setForm(f => { 
                        const items = [...f.items]
                        items[idx] = { ...items[idx], photo: file, image_url: '' }
                        return { ...f, items } 
                      })
                      setItemErrors([])
                    }} 
                    className="hidden"
                  />
                  
                  {/* Preview for item photo */}
                  {it.photo && (
                    <div className="mt-2 relative rounded-lg overflow-hidden border-2 border-gray-200">
                      <img 
                        src={URL.createObjectURL(it.photo)} 
                        alt="Item preview"
                        className="w-full h-32 object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm(f => {
                            const items = [...f.items];
                            items[idx] = { ...items[idx], photo: null };
                            return { ...f, items };
                          });
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                        <p className="text-white text-xs truncate">{it.photo.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div>
              <button type="button" onClick={() => setForm(f => ({ ...f, items: [...(f.items || []), { title: '', description: '', price: '', category_id: '', image_url: '', condition: 'good', photo: null }] }))} className="px-3 py-1 rounded bg-sky-600 text-white">Add item</button>
            </div>
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
