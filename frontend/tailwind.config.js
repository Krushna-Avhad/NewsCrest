/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: '#741515',
          dark: '#5a1010',
          light: '#8a2020',
        },
        tan: '#C1856D',
        wheat: '#E6CFA9',
        lemon: '#FBF9D1',
        smoke: '#F1EEEE',
        gold: {
          DEFAULT: '#DAA520',
          light: '#e8b830',
          muted: '#A97C00',
        },
        text: {
          primary: '#2A1F1F',
          secondary: '#5B4B4B',
          muted: '#7A6A6A',
          'on-maroon': '#FDF8F3',
        },
      },
      fontFamily: {
        playfair: ['"Playfair Display"', 'serif'],
        inter: ['Inter', 'sans-serif'],
      },
      borderColor: {
        'gold-subtle': 'rgba(218,165,32,0.3)',
        'gold-medium': 'rgba(218,165,32,0.5)',
      },
      boxShadow: {
        card:    '0 4px 20px rgba(42,31,31,0.07)',
        'card-md':'0 8px 32px rgba(42,31,31,0.10)',
        maroon:  '0 4px 14px rgba(116,21,21,0.3)',
      },
      borderRadius: {
        card:    '16px',
        'card-sm':'10px',
      },
      transitionDuration: {
        250: '250ms',
      },
      // Tailwind animation keys (the actual keyframes live in index.css)
      animation: {
        'page-enter':   'pageEnter 0.45s cubic-bezier(0.22,1,0.36,1) forwards',
        'card-reveal':  'cardReveal 0.5s cubic-bezier(0.22,1,0.36,1) forwards',
        'slide-left':   'slideInLeft 0.55s cubic-bezier(0.22,1,0.36,1) forwards',
        'slide-right':  'slideInRight 0.45s cubic-bezier(0.22,1,0.36,1) forwards',
        'panel-up':     'panelSlideUp 0.35s cubic-bezier(0.22,1,0.36,1) forwards',
        'fade-in':      'fadeIn 0.4s ease forwards',
        'pulse-soft':   'pulse-soft 2s infinite',
        'pulse-dot':    'pulseDot 2s ease infinite',
        'stat-appear':  'statAppear 0.5s cubic-bezier(0.22,1,0.36,1) forwards',
        'gold-line':    'goldLine 0.8s 0.2s cubic-bezier(0.22,1,0.36,1) forwards',
      },
    },
  },
  plugins: [],
}
