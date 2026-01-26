'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { NavHeader } from '@/components/NavHeader'
import LoadingScreen from '@/components/LoadingScreen'

interface UserProfile {
  id: string
  email: string | null
  username: string | null
  display_name: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export default function EditProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user || user.id !== userId) {
          router.push('/login')
          return
        }

        const response = await fetch(`/api/users/${userId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch profile')
        }

        const data = await response.json()
        setProfile(data.profile)
        setDisplayName(data.profile.display_name || '')
        setBio(data.profile.bio || '')
      } catch (err: any) {
        console.error('Error fetching profile:', err)
        setError(err.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchProfile()
    }
  }, [userId, router, supabase.auth])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    // Validate bio length
    if (bio.length > 160) {
      setError('Bio must be 160 characters or less')
      setSaving(false)
      return
    }


    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      setSuccess(true)
      // Redirect to profile page after a short delay
      setTimeout(() => {
        router.push(`/users/${userId}`)
        router.refresh()
      }, 1000)
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading..." />
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-[#fffdf5] flex items-center justify-center p-8">
        <div className="nb-card p-6 text-center">
          <p className="mb-4 font-bold text-black bg-[#ff6b6b] border-2 border-black px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {error}
          </p>
          <Link href={`/users/${userId}`} className="nb-button-outline px-6 py-3 inline-block">
            Back to profile
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fffdf5] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/users/${userId}`}
            className="inline-flex items-center gap-2 font-black uppercase text-sm mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to profile
          </Link>
          <div className="nb-tag inline-block mb-3">EDIT_PROFILE</div>
          <h1 className="text-3xl md:text-4xl font-black uppercase">Edit Profile</h1>
          <p className="text-sm font-bold text-gray-600 mt-2">Update your profile information</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="nb-card p-6 md:p-8 space-y-6">
          {/* Linked Spotify Account */}
          <div className="flex items-center gap-3 p-4 bg-[#e7ffe7] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <svg className="w-8 h-8 text-black flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            <div>
              <p className="font-black uppercase text-sm">Linked Spotify Account</p>
              <p className="text-sm font-bold text-gray-700">{profile?.email || 'Connected via Spotify'}</p>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-black uppercase mb-2">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
              maxLength={50}
              className="w-full px-4 py-3 nb-input"
            />
            <p className="mt-1 text-xs font-bold text-gray-600">
              Your public display name. Leave empty to use your Spotify name.
            </p>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-black uppercase mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              maxLength={160}
              rows={4}
              className="w-full px-4 py-3 nb-input resize-none"
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs font-bold text-gray-600">
                Brief description about yourself. Leave empty to remove.
              </p>
              <p className={`text-xs font-bold ${bio.length > 160 ? 'text-[#ff6b6b]' : 'text-gray-600'}`}>
                {bio.length}/160
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-[#ff6b6b] border-2 border-black text-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-[#4ade80] border-2 border-black text-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-sm">
              Profile updated successfully! Redirecting...
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 nb-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
            <Link
              href={`/users/${userId}`}
              className="flex-1 py-3 nb-button-outline text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
