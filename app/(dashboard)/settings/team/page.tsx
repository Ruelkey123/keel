'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import type { UserRole } from '@/types/database'

// Placeholder team members — real data fetched in a later phase
const PLACEHOLDER_MEMBERS: Array<{
  id: string
  full_name: string
  email: string
  role: UserRole
}> = []

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  dock_staff: 'Dock Staff',
}

const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-slate-100 text-slate-700',
  manager: 'bg-sky-50 text-sky-700',
  dock_staff: 'bg-emerald-50 text-emerald-700',
}

export default function TeamPage() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'manager' | 'dock_staff'>('manager')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setLoading(true)

    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: fullName, role }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setMessage({ type: 'error', text: data.error ?? 'Something went wrong.' })
    } else {
      setMessage({ type: 'success', text: data.message ?? 'Invited successfully.' })
      setEmail('')
      setFullName('')
      setRole('manager')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Team" />

      <div className="flex-1 p-6 space-y-6 max-w-3xl">
        {/* Current Members */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Team Members</CardTitle>
            <CardDescription className="text-slate-500">
              People who have access to your Keel organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {PLACEHOLDER_MEMBERS.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No team members yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {PLACEHOLDER_MEMBERS.map((member) => {
                  const initials = member.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                  return (
                    <li key={member.id} className="flex items-center gap-3 py-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {member.full_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{member.email}</p>
                      </div>
                      <Badge className={`text-xs font-medium ${ROLE_COLORS[member.role]}`}>
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Invite Form */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Invite a Team Member</CardTitle>
            <CardDescription className="text-slate-500">
              Add a manager or dock staff member to your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-name">Full name</Label>
                  <Input
                    id="invite-name"
                    type="text"
                    placeholder="Jane Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-slate-200"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as 'manager' | 'dock_staff')}
                >
                  <SelectTrigger id="invite-role" className="border-slate-200 w-48">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="dock_staff">Dock Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {message && (
                <div
                  className={`rounded-md px-3 py-2 border text-sm ${
                    message.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-red-50 border-red-200 text-red-600'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <Button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-md"
                disabled={loading}
              >
                {loading ? 'Sending invite...' : 'Send invite'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
