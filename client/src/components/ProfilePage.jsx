import { useEffect, useState } from 'react'
import { Layout } from './Layout'
import { LoadingSpinner } from './LoadingSpinner'
import { User, Phone, Mail, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function ProfilePage({
  isAuthenticated,
  user,
  favoritesCount,
  onLogout,
  searchQuery,
  setSearchQuery,
  location,
  setLocation
}) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    bio: '',
    phone: '',
    preferred_contact: 'email'
  })

  useEffect(() => {
    if (!isAuthenticated) return
    loadProfile()
  }, [isAuthenticated])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/users/profile`, {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setForm({
          bio: data.bio || '',
          phone: data.phone || '',
          preferred_contact: data.preferred_contact || 'email'
        })
      } else {
        toast.error('Failed to load profile')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      })

      if (res.ok) {
        const data = await res.json()
        setProfile(prev => ({ ...prev, ...data }))
        setEditing(false)
        toast.success('Profile updated successfully')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({
      bio: profile?.bio || '',
      phone: profile?.phone || '',
      preferred_contact: profile?.preferred_contact || 'email'
    })
    setEditing(false)
  }

  if (!isAuthenticated) {
    return (
      <Layout
        isAuthenticated={isAuthenticated}
        user={user}
        favoritesCount={favoritesCount}
        onLogout={onLogout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        location={location}
        setLocation={setLocation}
      >
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-red-600">Please log in to view your profile</p>
        </div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout
        isAuthenticated={isAuthenticated}
        user={user}
        favoritesCount={favoritesCount}
        onLogout={onLogout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        location={location}
        setLocation={setLocation}
      >
        <div className="max-w-4xl mx-auto px-6 py-8">
          <LoadingSpinner text="Loading profile..." />
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      isAuthenticated={isAuthenticated}
      user={user}
      favoritesCount={favoritesCount}
      onLogout={onLogout}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      location={location}
      setLocation={setLocation}
    >
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-8">
            <div className="flex items-center gap-4">
              <img
                src={profile?.avatarurl || user?.avatar_url || 'https://i.pravatar.cc/100'}
                alt={profile?.username || user?.username}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
              />
              <div className="text-white">
                <h1 className="text-3xl font-bold">{profile?.username || user?.username}</h1>
                <p className="text-emerald-100">
                  Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-6">
            {editing ? (
              /* Edit Mode */
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Bio
                  </label>
                  <textarea
                    value={form.bio}
                    onChange={e => setForm({ ...form, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-sm text-gray-500 mt-1">{form.bio.length}/500 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone Number (optional)
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">Only visible to you</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Preferred Contact Method
                  </label>
                  <select
                    value={form.preferred_contact}
                    onChange={e => setForm({ ...form, preferred_contact: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="message">In-app Message</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">How you'd like buyers to contact you</p>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Bio
                  </h3>
                  {profile?.bio ? (
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                  ) : (
                    <p className="text-gray-400 italic">No bio added yet</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone Number
                    </h3>
                    {profile?.phone ? (
                      <p className="text-gray-700">{profile.phone}</p>
                    ) : (
                      <p className="text-gray-400 italic">Not provided</p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      <MessageSquare className="w-4 h-4 inline mr-2" />
                      Preferred Contact
                    </h3>
                    <p className="text-gray-700 capitalize">
                      {profile?.preferred_contact === 'email' && (
                        <>
                          <Mail className="w-4 h-4 inline mr-1" />
                          Email
                        </>
                      )}
                      {profile?.preferred_contact === 'phone' && (
                        <>
                          <Phone className="w-4 h-4 inline mr-1" />
                          Phone
                        </>
                      )}
                      {profile?.preferred_contact === 'message' && (
                        <>
                          <MessageSquare className="w-4 h-4 inline mr-1" />
                          In-app Message
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <button
                    onClick={() => setEditing(true)}
                    className="w-full md:w-auto px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-colors"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Privacy Note:</strong> Your phone number is private and only visible to you. Your preferred contact method helps buyers know how to reach you about your yard sales.
          </p>
        </div>
      </div>
    </Layout>
  )
}
