/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // お手本＝青系、自分＝橙系（PitchOverlay と揃える）
        ref: '#2563eb',
        usr: '#f97316',
      },
    },
  },
  plugins: [],
};
