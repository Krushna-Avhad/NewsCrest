// src/components/layout/AppShell.jsx
import { useState } from "react";
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppShell({ title, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[90] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — always visible on desktop, drawer on mobile */}
      <div className={`fixed left-0 top-0 bottom-0 z-[100] transition-transform duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0`}>
        <Sidebar onClose={() => setMobileOpen(false)} />
      </div>

      {/* Main content */}
      <div className="md:ml-[260px] flex-1 min-h-screen w-full">
        <TopBar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="p-4 md:p-8 max-w-[1200px] page-enter">{children}</main>
      </div>

    </div>
  )
}