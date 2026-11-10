/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] },
      colors: {
        bg: v('bg'), surface: v('surface'), surface2: v('surface2'), ink: v('ink'), muted: v('muted'), line: v('line'),
        lav: { DEFAULT: '#A78BFA', ink: v('lav-ink') },
        mint: { DEFAULT: '#6DD3B2', ink: v('mint-ink') },
        peach: { DEFAULT: '#FFB59E', ink: v('peach-ink') },
        butter: { DEFAULT: '#F5D67B', ink: v('butter-ink') },
        sky: { DEFAULT: '#A5C7F7', ink: v('sky-ink') },
      },
      boxShadow: {
        soft: '0 1px 2px rgb(40 38 51 / 0.04), 0 10px 30px -14px rgb(40 38 51 / 0.14)',
        lift: '0 2px 6px rgb(40 38 51 / 0.06), 0 22px 44px -18px rgb(40 38 51 / 0.28)',
      },
      keyframes: {
        rise: { from: { opacity: '0.4', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        pop: { '0%': { transform: 'scale(0.4)' }, '70%': { transform: 'scale(1.15)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        rise: 'rise 380ms cubic-bezier(.2,.8,.2,1) both',
        fade: 'fade 200ms ease-out both',
        pop: 'pop 260ms ease-out both',
        page: 'rise 320ms cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
};
