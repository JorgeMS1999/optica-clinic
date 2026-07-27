/** @type {import('tailwindcss').Config} */
// Colores de la marca "Clínica Luz de tu Visión": verde + dorado.
// Se remapean las paletas "blue" (color primario del sistema) a VERDE
// y "cyan" (acentos del logo) a DORADO. Así todo el sistema toma la marca
// sin tocar cada componente.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Verde de la marca (reemplaza el azul primario)
        blue: {
          50:  '#eef9f0',
          100: '#d5f1d9',
          200: '#ace2b5',
          300: '#79ce88',
          400: '#4bb864',
          500: '#2e9f50',
          600: '#22823f',
          700: '#1d6a35',
          800: '#1a562d',
          900: '#164627',
          950: '#0a2a16',
        },
        // Dorado de la marca (reemplaza el cyan de los acentos)
        cyan: {
          50:  '#fdf8e6',
          100: '#faedc2',
          200: '#f5dc87',
          300: '#efc74c',
          400: '#e6ad1f',
          500: '#d1941a',
          600: '#a86f14',
          700: '#845414',
          800: '#6b4413',
          900: '#5a3913',
          950: '#33200a',
        },
      },
    },
  },
  plugins: [],
}
