/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#070b14', // near-black, deeper than the old slate-900
        bg2: '#0b1120', // secondary background for layered panels
        panel: 'rgba(20,28,46,0.6)', // glass — pair with backdrop-blur
        panel2: 'rgba(45,58,86,0.5)', // glass border / raised glass
        ink: '#e8eefc',
        muted: '#8a97b5',
        accent: '#3ee0ff', // neon cyan — primary
        accent2: '#a875ff', // neon violet — gradient partner
        bull: '#ffc04d', // gold-amber — exact-position hits
        cow: '#3ee0ff', // cyan — right-digit-wrong-place
        danger: '#ff5d6c',
        success: '#5cf2a3',
        warn: '#ffc04d',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px -2px rgba(62,224,255,0.45)',
        'glow-lg': '0 0 40px -4px rgba(62,224,255,0.55)',
        'glow-bull': '0 0 24px -2px rgba(255,192,77,0.6)',
        'glow-violet': '0 0 28px -2px rgba(168,117,255,0.5)',
        'glow-danger': '0 0 22px -2px rgba(255,93,108,0.5)',
        glass: '0 8px 32px -8px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.06)',
      },
      minHeight: {
        dvh: '100dvh',
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(6%,-4%,0) scale(1.12)' },
        },
        drift2: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1.1)' },
          '50%': { transform: 'translate3d(-7%,5%,0) scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        'breathe-border': {
          '0%, 100%': { boxShadow: '0 0 0 1px rgba(62,224,255,0.25), 0 0 18px -4px rgba(62,224,255,0.4)' },
          '50%': { boxShadow: '0 0 0 1px rgba(62,224,255,0.7), 0 0 34px -4px rgba(62,224,255,0.75)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'sweep': {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
      },
      animation: {
        drift: 'drift 22s ease-in-out infinite',
        drift2: 'drift2 26s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        'breathe-border': 'breathe-border 2.2s ease-in-out infinite',
        scanline: 'scanline 7s linear infinite',
        sweep: 'sweep 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [
    function safeArea({ addUtilities }) {
      addUtilities({
        '.pt-safe': { paddingTop: 'env(safe-area-inset-top)' },
        '.pb-safe': { paddingBottom: 'env(safe-area-inset-bottom)' },
        '.pl-safe': { paddingLeft: 'env(safe-area-inset-left)' },
        '.pr-safe': { paddingRight: 'env(safe-area-inset-right)' },
        '.min-h-dvh': { minHeight: '100dvh' },
        '.h-dvh': { height: '100dvh' },
      });
    },
  ],
};
