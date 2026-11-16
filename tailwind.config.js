/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { colors: {
    forest: { 50: '#eef5ee', 100: '#dcebdc', 500: '#477a4f', 600: '#386642', 700: '#2b5134' },
    canvas: 'var(--canvas)', surface: 'var(--surface)', subtle: 'var(--subtle)',
    text: 'var(--text)', muted: 'var(--muted)', border: 'var(--border)',
  } } },
  plugins: [],
}
