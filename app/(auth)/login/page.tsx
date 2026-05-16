'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.refresh()
    router.push('/dashboard')
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-md bg-slate-900 flex items-center justify-center">
            <span className="text-white text-sm font-bold">K</span>
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">Keel</span>
        </div>
        <p className="text-sm text-slate-500">Boat rental operations, simplified.</p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Sign in to your account</CardTitle>
          <CardDescription className="text-slate-500">
            Enter your credentials to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="border-slate-200"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-md"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="pt-0 flex justify-center">
          <p className="text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-sky-500 hover:text-sky-600">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
