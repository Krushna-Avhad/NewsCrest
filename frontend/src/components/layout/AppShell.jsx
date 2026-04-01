// src/components/layout/AppShell.jsx
// CategoryStrip removed per improvement request
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppShell({ title, children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-[260px] flex-1 min-h-screen">
        <TopBar title={title} />
        <main className="p-8 max-w-[1200px] page-enter">{children}</main>
      </div>
    </div>
  )
}
