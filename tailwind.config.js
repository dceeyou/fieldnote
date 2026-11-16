/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      gridTemplateColumns: {
        '7': 'repeat(7, minmax(0, 1fr))',
      },
      colors: {
        forest: {
          50: '#eef5ee',
          100: '#dcebdc',
          200: '#c1ddc3',
          500: '#477a4f',
          600: '#386642',
          700: '#2b5134',
          800: '#1f3d27',
          900: '#14291a',
        },
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        subtle: 'var(--subtle)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        border: 'var(--border)',
      },
    },
  },
  safelist: ['grid-cols-7'],
  plugins: [],
}
