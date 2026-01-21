'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Check if we have a valid reset token and exchange it for a session
    const checkToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      // Also check query params (some email clients might strip the hash)
      const queryToken = searchParams.get('access_token')
      const queryType = searchParams.get('type')

      // If we have recovery tokens in the hash, exchange them for a session
      if ((accessToken && refreshToken && type === 'recovery') || (queryToken && queryType === 'recovery')) {
        try {
          // Set the session using the tokens from the reset link
          const { error } = await supabase.auth.setSession({
            access_token: accessToken || queryToken || '',
            refresh_token: refreshToken || '',
          })

          if (error) {
            console.error('Error setting session:', error)
            setIsValidToken(false)
            setMessage('Invalid or expired reset link. Please request a new password reset.')
          } else {
            setIsValidToken(true)
            // Clear the hash from URL
            window.history.replaceState({}, '', window.location.pathname)
          }
        } catch (err) {
          console.error('Error processing reset token:', err)
          setIsValidToken(false)
          setMessage('Invalid or expired reset link. Please request a new password reset.')
        }
      } else {
        // Try to get session to see if user is already authenticated
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsValidToken(true)
        } else {
          setIsValidToken(false)
          setMessage('Invalid or expired reset link. Please request a new password reset.')
        }
      }
    }

    checkToken()
  }, [searchParams, supabase.auth])

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters'
    }

    const hasLowercase = /[a-z]/.test(pwd)
    const hasUppercase = /[A-Z]/.test(pwd)
    const hasDigit = /[0-9]/.test(pwd)
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)

    const missing = []
    if (!hasLowercase) missing.push('lowercase letter')
    if (!hasUppercase) missing.push('uppercase letter')
    if (!hasDigit) missing.push('digit')
    if (!hasSymbol) missing.push('symbol')

    if (missing.length > 0) {
      return `Password must include at least one ${missing.join(', ')}`
    }

    return null
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password requirements
    const passwordError = validatePassword(password)
    if (passwordError) {
      setMessage(passwordError)
      setLoading(false)
      return
    }

    try {
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setMessage(error.message)
        setLoading(false)
      } else {
        setMessage('Password updated successfully! Redirecting to login...')
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/login?reset=success')
        }, 2000)
      }
    } catch (err: any) {
      console.error('Error resetting password:', err)
      setMessage(err.message || 'Failed to reset password. Please try again.')
      setLoading(false)
    }
  }

  if (isValidToken === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#f5f1e8] dark:bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6b7d5a] mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  if (isValidToken === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#f5f1e8] dark:bg-slate-950">
        <div className="w-full max-w-md space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 text-center">
            <div className="mb-4">
              <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Invalid Reset Link
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {message || 'This password reset link is invalid or has expired.'}
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-[#6b7d5a] hover:bg-[#5a6b4a] text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#f5f1e8] dark:bg-slate-950">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
            Reset Password
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Enter your new password
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={8}
              className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#6b7d5a] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="At least 8 characters"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Must include: uppercase, lowercase, digit, and symbol
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={8}
              className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#6b7d5a] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Confirm your password"
            />
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${message.includes('failed') || message.includes('error') || message.includes('not match') || message.includes('at least') || message.includes('Invalid')
                  ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  : message.includes('successfully')
                    ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#6b7d5a] hover:bg-[#5a6b4a] text-white rounded-lg font-semibold shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6b7d5a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resetting Password...
              </span>
            ) : (
              'Reset Password'
            )}
          </button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-[#6b7d5a] hover:text-[#5a6b4a] dark:text-[#8a9a7a] dark:hover:text-[#7b8d6a]"
            >
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#f5f1e8] dark:bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6b7d5a] mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}

