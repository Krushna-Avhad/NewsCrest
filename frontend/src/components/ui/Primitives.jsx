// src/components/ui/Primitives.jsx

// ── Button ──────────────────────────────────────────────
export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const base =
    'inline-flex items-center gap-2 font-inter font-semibold rounded-[12px] cursor-pointer transition-all duration-200 whitespace-nowrap border-none'

  const variants = {
    primary:
      'bg-maroon text-text-on-maroon shadow-maroon hover:bg-maroon-dark hover:-translate-y-px hover:shadow-lg',
    secondary:
      'bg-smoke text-text-primary border border-gold-subtle hover:bg-wheat hover:border-gold',
    outline:
      'bg-transparent text-maroon border-[1.5px] border-maroon hover:bg-maroon hover:text-text-on-maroon',
    ghost:
      'bg-transparent text-text-secondary border border-transparent hover:bg-smoke hover:text-text-primary',
    gold:
      'bg-gold text-maroon-dark font-bold hover:bg-gold-light hover:-translate-y-px',
    danger:
      'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  }

  const sizes = {
    sm: 'px-[14px] py-[7px] text-[12px] rounded-[8px]',
    md: 'px-[22px] py-[11px] text-[13.5px]',
    lg: 'px-[32px] py-[14px] text-[15px]',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// ── Badge ──────────────────────────────────────────────
export function Badge({ variant = 'maroon', className = '', children }) {
  const variants = {
    maroon: 'bg-maroon/10 text-maroon',
    gold: 'bg-gold/15 text-gold-muted border border-gold/30',
    tan: 'bg-tan/15 text-[#7a4a36]',
    green: 'bg-green-500/10 text-green-700',
    red: 'bg-red-500/10 text-red-700',
    breaking: 'bg-red-600 text-white',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-[10px] py-[3px] rounded-full ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

// ── Tag/Category label ────────────────────────────────
export function NewsTag({ children, className = '' }) {
  return (
    <span
      className={`inline-block text-[10px] font-bold tracking-[1.5px] uppercase text-maroon bg-maroon/8 px-[10px] py-[3px] rounded-[6px] ${className}`}
    >
      {children}
    </span>
  )
}

// ── Pill filter ──────────────────────────────────────
export function Pill({ active = false, onClick, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-[14px] py-[6px] rounded-full text-[12px] font-medium border transition-all duration-200 cursor-pointer
        ${active
          ? 'bg-maroon text-text-on-maroon border-maroon'
          : 'bg-white text-text-secondary border-gold-subtle hover:border-gold hover:text-maroon hover:bg-lemon'
        } ${className}`}
    >
      {children}
    </button>
  )
}

// ── Input Field ─────────────────────────────────────
export function InputField({ label, className = '', ...props }) {
  return (
    <div className="mb-5">
      {label && (
        <label className="block text-[12px] font-semibold text-text-secondary mb-1.5 tracking-[0.3px]">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-[11px] border-[1.5px] border-gold/25 rounded-[12px] font-inter text-[14px] text-text-primary bg-white outline-none transition-all duration-200 placeholder:text-text-muted
          focus:border-gold focus:shadow-[0_0_0_3px_rgba(218,165,32,0.12)] ${className}`}
        {...props}
      />
    </div>
  )
}

// ── Toggle ──────────────────────────────────────────
import { useState } from 'react'
export function Toggle({ defaultOn = false, onChange }) {
  const [on, setOn] = useState(defaultOn)
  const toggle = () => {
    setOn(!on)
    onChange?.(!on)
  }
  return (
    <button
      onClick={toggle}
      className={`relative w-[44px] h-[24px] rounded-full border-[1.5px] transition-all duration-200 cursor-pointer flex-shrink-0
        ${on ? 'bg-maroon border-maroon' : 'bg-smoke border-gold/30'}`}
    >
      <span
        className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all duration-200
          ${on ? 'left-[22px]' : 'left-[2px]'}`}
      />
    </button>
  )
}

// ── Section header ───────────────────────────────────
export function SectionHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-playfair text-2xl font-bold text-text-primary section-title-underline inline-block">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[13.5px] text-text-muted mt-1.5">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  )
}

// ── Gold divider ─────────────────────────────────────
export function GoldDivider() {
  return <div className="divider-gold" />
}

// ── Empty state ──────────────────────────────────────
export function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="text-center py-16 px-10">
      <div className="flex justify-center mb-4 text-text-muted opacity-40">{icon}</div>
      <h3 className="font-playfair text-xl font-bold mb-2">{title}</h3>
      <p className="text-[13.5px] text-text-muted max-w-[300px] mx-auto mb-5">{desc}</p>
      {action}
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-smoke p-1 rounded-[12px] w-fit">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-[18px] py-2 rounded-[9px] text-[13px] font-medium transition-all duration-200 cursor-pointer border-none
            ${active === tab
              ? 'bg-white text-maroon font-semibold shadow-card'
              : 'bg-transparent text-text-secondary hover:text-text-primary'
            }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
