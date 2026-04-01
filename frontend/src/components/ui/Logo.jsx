// src/components/ui/Logo.jsx

// Logo used on the dark/maroon sidebar — "News" in bright white, "Crest" in gold
export function Logo({ className = '', size = 'md' }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-[22px]',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }
  return (
    <span className={`font-playfair font-extrabold tracking-tight ${sizes[size]} ${className}`}>
      <span style={{ color: '#FFFFFF' }}>News</span>
      <span style={{ color: '#DAA520' }}>Crest</span>
    </span>
  )
}

// Logo used on light backgrounds (landing nav, etc) — "News" in maroon, "Crest" in gold
export function LogoDark({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-[22px]',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }
  return (
    <span className={`font-playfair font-extrabold tracking-tight ${sizes[size]} ${className}`}>
      <span style={{ color: '#741515' }}>News</span>
      <span style={{ color: '#DAA520' }}>Crest</span>
    </span>
  )
}

// Logo used on dark panels (login/signup left panel, CTA section) — "News" in crisp white, "Crest" in gold
// Always white "News" regardless of parent background
export function LogoOnDark({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-[22px]',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }
  return (
    <span className={`font-playfair font-extrabold tracking-tight ${sizes[size]} ${className}`}>
      <span style={{ color: '#FFFFFF', textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>News</span>
      <span style={{ color: '#DAA520' }}>Crest</span>
    </span>
  )
}
