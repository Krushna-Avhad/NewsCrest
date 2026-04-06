// src/components/layout/CategoryStrip.jsx
import { useApp } from '../../context/AppContext'
import { CATEGORIES } from '../../data/newsData'

export default function CategoryStrip() {
  const { setPage, setActiveCat, activeCat, page } = useApp()

  const handleCat = (name) => {
    setActiveCat(name)
    setPage('catdetail')
  }

  return (
    <div className="bg-white border-b border-gold/25 px-8 overflow-x-auto">
      <div className="flex items-center gap-1 py-2 min-w-max">
        {CATEGORIES.map(({ name }) => {
          const isActive = page === 'catdetail' && activeCat === name
          return (
            <button
              key={name}
              onClick={() => handleCat(name)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap cursor-pointer transition-all duration-200 border
                ${isActive
                  ? 'bg-maroon text-white border-maroon'
                  : 'bg-transparent text-text-secondary border-transparent hover:bg-smoke hover:text-text-primary hover:border-gold/25'
                }`}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
