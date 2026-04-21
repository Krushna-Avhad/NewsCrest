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

      {/* Sidebar wrapper — inline styles for reliable transform */}
      <div
        className="fixed top-0 left-0 h-full z-[100] md:translate-x-0 transition-transform duration-300 ease-in-out"
        style={{
          width: "260px",
          transform: mobileOpen ? "translateX(0)" : "translateX(-260px)",
        }}
      >
        <Sidebar onClose={() => setMobileOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-screen md:ml-[260px] w-full">
        <TopBar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="p-4 md:p-8 max-w-[1200px] page-enter">
          {children}
        </main>
      </div>

    </div>
  )
}