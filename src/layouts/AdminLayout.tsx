import { Outlet } from '@tanstack/react-router'
import { Sidebar } from '@/components/Sidebar'
import { useSession } from '@/api/queries'

export function AdminLayout() {
  const { data } = useSession()
  return (
    <div className="shell">
      <Sidebar user={data} />
      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}
