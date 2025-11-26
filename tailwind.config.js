/** @type {import('tailwindcss').Config} */
module.exports = {
  // Asegura que escanee todos los archivos JavaScript y JSX en la carpeta src
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      // Si quieres extender los colores o tipografías de Tailwind, se hace aquí.
    },
  },
  plugins: [],
}