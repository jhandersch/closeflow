"use client"

import AuthGuard from "@/components/AuthGuard"
import { useNotifications } from "@/hooks/useNotifications"

export default function NotificationsPage() {
  const { notifications, loading } = useNotifications()

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">Notifications</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Notifications</h1>
        </div>

        {loading ? (
          <p className="text-foreground/65">Loading...</p>
        ) : notifications.length === 0 ? (
          <p className="text-foreground/65">No active notifications.</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div key={notification.id} className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
                <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                <p className="mt-1 text-sm text-foreground/65">{notification.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  )
}