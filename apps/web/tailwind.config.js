/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f172a',
        panel: '#1e293b',
        panel2: '#334155',
        ink: '#e2e8f0',
        muted: '#94a3b8',
        accent: '#38bdf8',
        danger: '#f87171',
        success: '#4ade80',
        warn: '#fbbf24',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      minHeight: {
        dvh: '100dvh',
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
